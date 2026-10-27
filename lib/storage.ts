import type { AppState, Category, Mode, MotionLevel, Priority, Status, Task } from "./types";

export const STORAGE_KEY = "tasksphere.v1";
export const PREFS_KEY = "tasksphere.preferences.v1";
export const NAV_KEY = "tasksphere.navCollapsed";
export const ASSIST_KEY = "tasksphere.assistHidden";
export const VIEW_KEY = "tasksphere.view";
export const QUEUE_KEY = "tasksphere.sync-queue.v1";
export const TIMER_SESSION_KEY = "tasksphere.focus-session.v1";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
const CATEGORIES: Category[] = ["study", "work", "wellness", "life"];
const MODE_LIST: Mode[] = ["light", "cyber", "zen", "retro", "brutalist"];
const MOTION_LEVELS: MotionLevel[] = ["full", "subtle", "reduced"];

export function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function blankState(): AppState {
  return {
    version: 2,
    tasks: [],
    xp: 0,
    gold: 0,
    unlockedThemes: ["default"],
    activity: {},
    focusByDay: {},
    shieldedDays: [],
    focusMinutes: 0,
    petEnergy: 65,
    bossHp: 500,
    bossWeek: "",
    streakShield: true,
    shieldUsedOn: "",
    soundEnabled: true,
    minuteChime: false,
    awayChime: false,
    soundVolume: 0.45,
    motionLevel: "full",
    focusDefault: 25,
    dailyGoal: 3,
    theme: "default",
    uiMode: "light",
    ambientSound: "off",
    crtEnabled: false,
    bounties: {},
    lastDecay: Date.now(),
    focus: { minutes: 25, mode: "focus" },
    activityMode: "focus",
  };
}

function clamp(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeTask(raw: Record<string, unknown>): Task {
  const completed = Boolean(raw.completed);
  const statusRaw = raw.status;
  const status: Status = completed
    ? "done"
    : statusRaw === "progress" || statusRaw === "todo"
      ? statusRaw
      : "todo";
  const subtasksRaw = Array.isArray(raw.subtasks) ? raw.subtasks : [];
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uuid(),
    text: String(raw.text ?? "Untitled quest").slice(0, 140),
    category: CATEGORIES.includes(raw.category as Category)
      ? (raw.category as Category)
      : "life",
    priority: PRIORITIES.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : "medium",
    status,
    tags: tagsRaw.filter((tag): tag is string => typeof tag === "string").slice(0, 12),
    note: String(raw.note ?? "").slice(0, 280),
    created: Number.isFinite(Number(raw.created)) ? Number(raw.created) : Date.now(),
    updated: Number.isFinite(Number(raw.updated)) ? Number(raw.updated) : undefined,
    completed,
    completedAt: completed
      ? Number.isFinite(Number(raw.completedAt))
        ? Number(raw.completedAt)
        : Date.now()
      : null,
    subtasks: subtasksRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .slice(0, 30)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : uuid(),
        text: String(item.text ?? "").slice(0, 120),
        done: Boolean(item.done),
      })),
    due: typeof raw.due === "string" && raw.due ? raw.due : null,
  };
}

export function normalizeTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 1000)
    .map(normalizeTask)
    .map((task) => {
      if (seen.has(task.id)) task.id = uuid();
      seen.add(task.id);
      return task;
    });
}

/** Preferences live in their own key and win over the profile blob, as before. */
function objectMap(value: unknown): Record<string, number> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {};
}

export function normalizeAppState(raw: unknown, prefs: unknown): AppState {
  const base = blankState();
  const state = {
    ...base,
    ...(raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Partial<AppState>) : {}),
    ...(prefs && typeof prefs === "object" && !Array.isArray(prefs)
      ? (prefs as Partial<AppState>)
      : {}),
  };
  return {
    ...state,
    version: 2,
    tasks: normalizeTasks(
      raw && typeof raw === "object" ? (raw as Record<string, unknown>).tasks : [],
    ),
    xp: clamp(state.xp, 0),
    gold: clamp(state.gold, 0),
    focusMinutes: clamp(state.focusMinutes, 0),
    petEnergy: clamp(state.petEnergy, 65, 0, 100),
    bossHp: clamp(state.bossHp, 500, 0, 500),
    soundVolume: clamp(state.soundVolume, 0.45, 0, 1),
    focusDefault: clamp(state.focusDefault, 25, 1, 180),
    dailyGoal: clamp(state.dailyGoal, 3, 1, 20),
    unlockedThemes: Array.isArray(state.unlockedThemes)
      ? [...new Set(["default", ...state.unlockedThemes.map(String)])]
      : ["default"],
    shieldedDays: Array.isArray(state.shieldedDays) ? state.shieldedDays.map(String) : [],
    activity: objectMap(state.activity),
    focusByDay: objectMap(state.focusByDay),
    bounties: objectMap(state.bounties),
    uiMode: MODE_LIST.includes(state.uiMode) ? state.uiMode : "light",
    motionLevel: MOTION_LEVELS.includes(state.motionLevel) ? state.motionLevel : "full",
    focus: {
      minutes: clamp(state.focus?.minutes, 25, 1, 180),
      mode: String(state.focus?.mode ?? "focus"),
    },
  };
}

function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseJson(value: string | null): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function loadState(): AppState {
  if (typeof window === "undefined") return blankState();
  return normalizeAppState(parseJson(readItem(STORAGE_KEY)), parseJson(readItem(PREFS_KEY)));
}

const PREF_KEYS: (keyof AppState)[] = [
  "uiMode",
  "theme",
  "ambientSound",
  "crtEnabled",
  "motionLevel",
  "soundEnabled",
  "minuteChime",
  "awayChime",
  "soundVolume",
  "focusDefault",
  "dailyGoal",
];

/** Split write mirrors the shipped app: profile blob plus preferences blob. */
export function saveState(state: AppState): void {
  try {
    const prefs: Record<string, unknown> = {};
    for (const key of PREF_KEYS) prefs[key] = state[key];
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: local-first still serves the session from memory */
  }
}

export function applyThemeToDocument(state: AppState): void {
  const root = document.documentElement;
  root.dataset.mode = state.uiMode;
  root.dataset.crt = String(state.crtEnabled);
  root.dataset.motion = state.motionLevel;
  document.body.dataset.theme = state.theme;
}
