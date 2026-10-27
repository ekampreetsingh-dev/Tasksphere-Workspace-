import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppState, Task } from "./types";
import { QUEUE_KEY, loadState, normalizeAppState, saveState } from "./storage";

export const PROFILE_TABLE = "tasksphere_app_profiles";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

/* Accepts any Supabase project host, not just .supabase.co — projects in the
   Mumbai and Sydney regions are served from .supabase.in / .supabase.net, and a
   strict .co-only test silently disabled every sync path for those users. A
   trailing slash is tolerated for the same reason. */
export function cloudConfigured(): boolean {
  return /^https:\/\/[\w-]+\.supabase\.[a-z]{2,}\/?$/i.test(url) && anonKey.length > 30;
}

export function getSupabase(): SupabaseClient | null {
  if (!cloudConfigured()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

/**
 * The shipped app overwrote the whole profile with whichever device wrote last,
 * so a task created on the laptop could vanish after the phone synced. The blob
 * row stays (no migration against the live database), but reads now merge by task
 * id and honour updated_at instead of blindly replacing local state.
 *
 * Per-task, the same trap applied in miniature: comparing `created` meant two
 * devices holding the same task always tied, and the tie went to local — so an
 * edit made on the laptop was discarded on the phone forever. Merge on the last
 * mutation instead, falling back to `created` for blobs written before the
 * field existed.
 */
export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  const stamp = (task: Task) => task.updated ?? task.created;
  const byId = new Map<string, Task>();
  for (const task of remote) byId.set(task.id, task);
  for (const task of local) {
    const existing = byId.get(task.id);
    if (!existing || stamp(task) >= stamp(existing)) byId.set(task.id, task);
  }
  return [...byId.values()].sort((a, b) => b.created - a.created);
}

export interface Account {
  id: string;
  email: string | null;
}

/** Who the cloud considers signed in, for the sync ledger. Null when off. */
export async function currentAccount(): Promise<Account | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/** The write held in localStorage, if a sync failed and nothing replaced it. */
export function queuedWrite(): { at: number; tasks: number } | null {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; payload?: AppState };
    return {
      at: parsed.at ?? Date.now(),
      tasks: parsed.payload?.tasks.length ?? 0,
    };
  } catch {
    return null;
  }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}

type ProfileRow = { payload: Record<string, unknown>; updated_at: string };

export async function pullCloud(): Promise<AppState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("payload, updated_at")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();
  if (error) noteError(error.message);
  if (error || !data) return null;

  const local = loadState();
  const remote = normalizeAppState(data.payload, {});
  const activity = { ...remote.activity };
  for (const [day, count] of Object.entries(local.activity)) {
    activity[day] = Math.max(activity[day] ?? 0, count);
  }
  return {
    ...remote,
    tasks: mergeTasks(local.tasks, remote.tasks),
    activity,
    xp: Math.max(local.xp, remote.xp),
    gold: Math.max(local.gold, remote.gold),
    uiMode: local.uiMode,
    motionLevel: local.motionLevel,
  };
}

let inFlight: Promise<unknown> | null = null;
let queued: AppState | null = null;

/**
 * "none" is not a failure — it means nobody is signed in on this device, which
 * is the normal local-first state. Collapsing it into an error made an offline
 * anonymous device look broken.
 */
export type PushResult = "ok" | "none" | "error";

/* Surfaced through the sync ledger so a failed write is explainable, not just
   a red dot. Cleared on the next success. */
let lastError: string | null = null;

export function lastSyncError(): string | null {
  return lastError;
}

function noteError(message: string): void {
  lastError = message.slice(0, 180);
}

export async function pushCloud(state: AppState): Promise<PushResult> {
  const supabase = getSupabase();
  if (!supabase) return "none";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "none";

  if (inFlight) {
    queued = state;
    await inFlight;
    return pushCloud(state);
  }

  /* The Postgrest builder is thenable but not a Promise; adopt it so the
     single-in-flight guard below can compare and await it. */
  inFlight = Promise.resolve(
    supabase.from(PROFILE_TABLE).upsert(
      {
        user_id: user.id,
        payload: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
  );

  try {
    const { error } = (await inFlight) as { error: { message: string } | null };
    if (error) {
      noteError(error.message);
      enqueue(state);
      return "error";
    }
    lastError = null;
    const pending = queued;
    queued = null;
    if (pending) await pushCloud(pending);
    return "ok";
  } catch (cause) {
    noteError(cause instanceof Error ? cause.message : String(cause));
    enqueue(state);
    return "error";
  } finally {
    inFlight = null;
  }
}

/* Offline writes: keep the last pending profile and flush on reconnect. */
function enqueue(state: AppState): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify({ at: Date.now(), payload: state }));
  } catch {
    /* ignore */
  }
}

export async function flushQueue(): Promise<PushResult> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(QUEUE_KEY);
  } catch {
    return "none";
  }
  if (!raw) return "none";
  try {
    const parsed = JSON.parse(raw) as { payload: AppState };
    const pushed = await pushCloud(parsed.payload);
    if (pushed === "ok") clearQueue();
    return pushed;
  } catch {
    return "error";
  }
}

export async function syncOnReconnect(): Promise<void> {
  const pulled = await pullCloud();
  if (pulled) saveState(pulled);
  await flushQueue();
}
