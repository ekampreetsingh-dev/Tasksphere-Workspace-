"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Category, Mode, MotionLevel, Priority, Task } from "./types";
import {
  XP_BY_PRIORITY,
  BOSS_HP_MAX,
  levelInfo,
  petStageFor,
  type Purchase,
} from "./constants";
import { dayKey, shiftDate, weekKey } from "./dates";
import {
  applyThemeToDocument,
  blankState,
  loadState,
  normalizeTasks,
  saveState,
  uuid,
} from "./storage";
import {
  cloudConfigured,
  currentAccount,
  flushQueue,
  getSupabase,
  lastSyncError,
  pullCloud,
  pushCloud,
  queuedWrite,
  type Account,
  type PushResult,
} from "./supabase";

export type SyncStatus = "off" | "idle" | "pending" | "error" | "synced";

export interface QueuedWrite {
  at: number;
  tasks: number;
}

export interface SyncLedger {
  configured: boolean;
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  attempts: number;
  queued: QueuedWrite | null;
  account: Account | null;
}

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "add"; task: Task }
  | { type: "patch"; id: string; patch: Partial<Task> }
  | { type: "remove"; id: string }
  | { type: "toggle"; id: string }
  | { type: "pref"; patch: Partial<AppState> }
  | { type: "purchase"; item: Purchase }
  | { type: "replace"; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
    case "replace":
      return action.state;
    case "add":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "patch":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, ...action.patch } : task,
        ),
      };
    case "remove":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };
    case "toggle":
      return toggleTaskInState(state, action.id);
    case "pref":
      return { ...state, ...action.patch };
    case "purchase": {
      /* One atomic write: the balance and what it bought can never disagree,
         which is exactly how a synced two-device account used to desync. */
      const { item } = action;
      if (state.gold < item.cost) return state;
      const next = { ...state, gold: state.gold - item.cost };
      if (item.energy) next.petEnergy = Math.min(100, next.petEnergy + item.energy);
      if (item.shield) next.streakShield = true;
      if (item.skin) {
        next.unlockedThemes = [...new Set([...next.unlockedThemes, item.skin])];
        next.theme = item.skin;
      }
      return next;
    }
    default:
      return state;
  }
}

/** Completion pays out XP, gold, companion energy and boss damage in one step. */
function toggleTaskInState(state: AppState, id: string): AppState {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return state;
  const completed = !task.completed;
  const updated: Task = {
    ...task,
    completed,
    status: completed ? "done" : "todo",
    completedAt: completed ? Date.now() : null,
    subtasks: completed ? task.subtasks.map((sub) => ({ ...sub, done: true })) : task.subtasks,
  };
  const tasks = state.tasks.map((item) => (item.id === id ? updated : item));
  if (!completed) {
    return { ...state, tasks };
  }
  const today = dayKey();
  const xpGain = XP_BY_PRIORITY[task.priority] ?? 15;
  return {
    ...state,
    tasks,
    xp: state.xp + xpGain,
    gold: state.gold + goldFor(task.priority),
    petEnergy: Math.min(100, state.petEnergy + 8),
    bossHp: Math.max(0, state.bossHp - xpGain),
    activity: { ...state.activity, [today]: (state.activity[today] ?? 0) + 1 },
  };
}

export interface NewTaskInput {
  text: string;
  category?: Category;
  priority?: Priority;
  due?: string | null;
  tags?: string[];
  note?: string;
}

/** Daily bookkeeping carried over from the shipped build. */
function applyDailyRules(state: AppState): AppState {
  const next = { ...state };
  const today = dayKey();
  const prev = dayKey(shiftDate(new Date(), -1));
  if (
    (next.activity[prev] ?? 0) > 0 &&
    next.activity[today] === undefined &&
    next.streakShield &&
    next.shieldUsedOn !== today
  ) {
    next.activity = { ...next.activity, [today]: 0 };
    next.shieldedDays = [...next.shieldedDays, today];
    next.streakShield = false;
    next.shieldUsedOn = today;
  }
  const wk = weekKey();
  if (next.bossWeek !== wk) {
    next.bossWeek = wk;
    next.bossHp = BOSS_HP_MAX;
  }
  const daysIdle = Math.floor((Date.now() - (next.lastDecay || Date.now())) / 86400000);
  if (daysIdle > 0) {
    next.petEnergy = Math.max(0, next.petEnergy - Math.min(60, daysIdle * 5));
    next.lastDecay = Date.now();
  }
  return next;
}

function goldFor(priority: Priority): number {
  if (priority === "urgent") return 8;
  if (priority === "high") return 6;
  if (priority === "medium") return 4;
  return 3;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A payout the shell animates into the campaign bar. Ephemeral by design —
 * it is an animation cue, not state, so it never enters the sync blob.
 */
export interface XpPulse {
  id: number;
  xp: number;
  kind: "quest" | "focus";
  /** Viewport coordinates of the click that earned it; null when there was none. */
  origin: Point | null;
}

interface StoreValue {
  state: AppState;
  ready: boolean;
  online: boolean;
  sync: SyncLedger;
  level: ReturnType<typeof levelInfo>;
  petStage: number;
  streak: number;
  pulse: XpPulse | null;
  addTask: (input: NewTaskInput) => Task | null;
  patchTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setStatus: (id: string, status: Task["status"]) => void;
  toggleTask: (
    id: string,
    origin?: Point,
  ) => { xpGain: number; goldGain: number } | null;
  purchase: (item: Purchase) => { ok: boolean; message: string };
  setPref: (patch: Partial<AppState>) => void;
  claimFocusSession: (minutes: number, origin?: Point) => void;
  retrySync: () => void;
  replaceState: (state: AppState) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, blankState());
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    cloudConfigured() ? "idle" : "off",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [queued, setQueued] = useState<QueuedWrite | null>(null);
  const [pulse, setPulse] = useState<XpPulse | null>(null);
  const pulseSeq = useRef(0);
  const lastPushed = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const accountRef = useRef<Account | null>(null);
  accountRef.current = account;

  const recordPush = useCallback((result: PushResult) => {
    if (result === "ok") {
      setSyncStatus("synced");
      setLastSyncedAt(Date.now());
      setAttempts(0);
      setQueued(null);
      setLastError(null);
    } else if (result === "error") {
      setSyncStatus("error");
      setAttempts((count) => count + 1);
      setQueued(queuedWrite());
      setLastError(lastSyncError());
    } else {
      /* Nobody signed in: local-first, not a failure. */
      setSyncStatus("idle");
    }
  }, []);

  /** Pull the cloud profile and merge it over local state. */
  const pullAndMerge = useCallback(async () => {
    const merged = await pullCloud();
    if (merged) {
      dispatch({ type: "replace", state: applyDailyRules(merged) });
      setSyncStatus("synced");
      setLastSyncedAt(Date.now());
      setQueued(null);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const loaded = applyDailyRules(loadState());
    dispatch({ type: "hydrate", state: loaded });
    applyThemeToDocument(loaded);
    setOnline(navigator.onLine);
    setQueued(queuedWrite());
    setReady(true);

    const goOnline = () => {
      setOnline(true);
      setSyncStatus("pending");
      void flushQueue().then((result) => {
        if (result === "ok") recordPush("ok");
        else if (result === "error") recordPush("error");
        else setSyncStatus(cloudConfigured() ? "idle" : "off");
      });
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [recordPush]);

  /* Pull once per session, then keep the document theme in step with state. */
  useEffect(() => {
    if (!ready || !cloudConfigured()) return;
    void (async () => {
      setSyncStatus("pending");
      const merged = await pullAndMerge();
      if (!merged) setSyncStatus("idle");
      void currentAccount().then(setAccount);
    })();
  }, [ready, pullAndMerge]);

  /* A sign-in mid-session has to pull immediately; waiting for a reload is the
     same bug that made the shipped app look like it had forgotten your data. */
  useEffect(() => {
    if (!cloudConfigured()) return;
    let sub: { unsubscribe: () => void } | null = null;
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        setAccount(
          session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
        );
        if (event === "SIGNED_IN") void pullAndMerge();
        else if (event === "SIGNED_OUT") setSyncStatus("idle");
      });
      sub = data.subscription;
    } catch {
      return;
    }
    return () => sub?.unsubscribe();
  }, [pullAndMerge]);

  useEffect(() => {
    if (ready) applyThemeToDocument(state);
  }, [ready, state]);

  /* Debounced local write, then a cloud write at most every few seconds. */
  useEffect(() => {
    if (!ready) return;
    const local = window.setTimeout(() => saveState(state), 220);
    const cloud = window.setTimeout(
      () => {
        /* No session, nothing to push: an anonymous device is local-first by
           design, so it must not be reported as a failed sync. */
        if (!cloudConfigured() || !navigator.onLine || !accountRef.current) return;
        if (Date.now() - lastPushed.current < 4000) return;
        lastPushed.current = Date.now();
        setSyncStatus("pending");
        void pushCloud(state).then(recordPush);
      },
      2600,
    );
    return () => {
      window.clearTimeout(local);
      window.clearTimeout(cloud);
    };
  }, [ready, state, recordPush]);

  const retrySync = useCallback(() => {
    if (!cloudConfigured()) return;
    if (!accountRef.current) {
      setSyncStatus("idle");
      return;
    }
    setSyncStatus("pending");
    void (async () => {
      const flushed = await flushQueue();
      const result = flushed === "none" ? await pushCloud(stateRef.current) : flushed;
      recordPush(result);
      if (result === "ok") await pullAndMerge();
    })();
  }, [pullAndMerge, recordPush]);

  const purchase = useCallback((item: Purchase) => {
    const current = stateRef.current;
    if (item.skin && current.unlockedThemes.includes(item.skin)) {
      dispatch({ type: "pref", patch: { theme: item.skin } });
      return { ok: true, message: `${item.name} equipped.` };
    }
    if (item.shield && current.streakShield) {
      return { ok: false, message: "The shield is already armed." };
    }
    if (item.energy && current.petEnergy >= 100) {
      return { ok: false, message: "Your companion is at full energy." };
    }
    if (item.requiredLevel && levelInfo(current.xp).level < item.requiredLevel) {
      return { ok: false, message: `Reach rank ${item.requiredLevel} first.` };
    }
    if (current.gold < item.cost) {
      return {
        ok: false,
        message: `${item.cost} gold needed — you have ${current.gold}.`,
      };
    }
    dispatch({ type: "purchase", item });
    return { ok: true, message: `${item.name} bought · −${item.cost} gold` };
  }, []);

  const addTask = useCallback(
    (input: NewTaskInput) => {
      const text = input.text.trim().slice(0, 140);
      if (!text) return null;
      const task: Task = normalizeTasks([
        {
          id: uuid(),
          text,
          category: input.category ?? "life",
          priority: input.priority ?? "medium",
          status: "todo",
          tags: input.tags ?? [],
          created: Date.now(),
          completed: false,
          subtasks: [],
          due: input.due ?? null,
          note: input.note?.trim().slice(0, 280) ?? "",
        },
      ])[0];
      dispatch({ type: "add", task });
      return task;
    },
    [],
  );

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    dispatch({ type: "patch", id, patch });
  }, []);

  const removeTask = useCallback((id: string) => {
    dispatch({ type: "remove", id });
  }, []);

  const setStatus = useCallback(
    (id: string, status: Task["status"]) => {
      patchTask(id, {
        status,
        completed: status === "done",
        completedAt: status === "done" ? Date.now() : null,
      });
    },
    [patchTask],
  );

  const toggleTask = useCallback((id: string, origin?: Point) => {
    const task = stateRef.current.tasks.find((item) => item.id === id);
    if (!task) return null;
    dispatch({ type: "toggle", id });
    if (task.completed) return null;
    const xpGain = XP_BY_PRIORITY[task.priority] ?? 15;
    pulseSeq.current += 1;
    setPulse({ id: pulseSeq.current, xp: xpGain, kind: "quest", origin: origin ?? null });
    return {
      xpGain,
      goldGain: goldFor(task.priority),
    };
  }, []);

  const value = useMemo<StoreValue>(() => {
    const level = levelInfo(state.xp);
    return {
      state,
      ready,
      online,
      sync: {
        configured: cloudConfigured(),
        status: syncStatus,
        lastSyncedAt,
        lastError,
        attempts,
        queued,
        account,
      },
      level,
      petStage: petStageFor(level.level),
      streak: computeStreak(state),
      pulse,
      addTask,
      patchTask,
      removeTask,
      setStatus,
      toggleTask,
      purchase,
      retrySync,
      setPref: (patch) => dispatch({ type: "pref", patch }),
      claimFocusSession: (minutes, origin) => {
        dispatch({
          type: "pref",
          patch: {
            xp: state.xp + 50,
            gold: state.gold + 10,
            focusMinutes: state.focusMinutes + minutes,
            focusByDay: {
              ...state.focusByDay,
              [dayKey()]: (state.focusByDay[dayKey()] ?? 0) + minutes,
            },
          },
        });
        pulseSeq.current += 1;
        setPulse({ id: pulseSeq.current, xp: 50, kind: "focus", origin: origin ?? null });
      },
      replaceState: (next) => dispatch({ type: "replace", state: next }),
    };
  }, [
    state,
    ready,
    online,
    syncStatus,
    lastSyncedAt,
    lastError,
    attempts,
    queued,
    account,
    pulse,
    retrySync,
    purchase,
    addTask,
    patchTask,
    removeTask,
    setStatus,
    toggleTask,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function computeStreak(state: AppState): number {
  let date = new Date();
  const today = dayKey(date);
  if (!(state.activity[today] > 0) && !state.shieldedDays.includes(today)) {
    date = shiftDate(date, -1);
  }
  let streak = 0;
  for (let guard = 0; guard < 3650; guard++) {
    const key = dayKey(date);
    if ((state.activity[key] ?? 0) > 0 || state.shieldedDays.includes(key)) {
      streak++;
      date = shiftDate(date, -1);
    } else break;
  }
  return streak;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export type { Mode, MotionLevel, Purchase };
export { XP_BY_PRIORITY, goldFor };
