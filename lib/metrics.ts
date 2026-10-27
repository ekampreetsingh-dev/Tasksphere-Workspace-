import type { AppState } from "./types";
import { dayKey, mondayOf, shiftDate } from "./dates";

/**
 * Derived telemetry for the dashboard tabs. Pure functions of AppState so the
 * same numbers can be read from Home, Progress and Focus without drift.
 */

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export interface DayPoint {
  key: string;
  label: string;
  completed: number;
  focus: number;
  isToday: boolean;
}

/** Trailing window ending today, oldest first. */
export function daySeries(state: AppState, days = 14): DayPoint[] {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(today, index - (days - 1));
    const key = dayKey(date);
    return {
      key,
      label: WEEKDAY_LABELS[(date.getDay() + 6) % 7],
      completed: state.activity[key] ?? 0,
      focus: state.focusByDay[key] ?? 0,
      isToday: index === days - 1,
    };
  });
}

function sumBy(keys: string[], source: Record<string, number>): number {
  return keys.reduce((total, key) => total + (source[key] ?? 0), 0);
}

export interface CompletionStats {
  today: number;
  thisWeek: number;
  allTime: number;
  open: number;
  cleared: number;
}

export function completionStats(state: AppState): CompletionStats {
  const series = daySeries(state, 7);
  const today = dayKey();
  return {
    today: state.activity[today] ?? 0,
    thisWeek: sumBy(
      series.map((day) => day.key),
      state.activity,
    ),
    allTime: sumBy(Object.keys(state.activity), state.activity),
    open: state.tasks.filter((task) => !task.completed).length,
    cleared: state.tasks.filter((task) => task.completed).length,
  };
}

/** Share of everything ever captured that reached the done lane. */
export function completionRate(state: AppState): number {
  const { allTime, open } = completionStats(state);
  const denominator = allTime + open;
  if (denominator <= 0) return 0;
  return Math.round((allTime / denominator) * 100);
}

export interface WeekDay {
  key: string;
  label: string;
  numeral: number;
  cleared: number;
  focus: number;
  isToday: boolean;
  future: boolean;
}

export interface CalendarWeek {
  start: Date;
  days: WeekDay[];
  cleared: number;
  focus: number;
  activeDays: number;
}

/**
 * The single definition of "this week": Monday to Sunday of the week containing
 * today. Progress previously mixed this with a trailing-seven-days window, so
 * two panels on the same screen could report different totals for the same
 * phrase. Anything labelled "this week" must come from here.
 */
export function calendarWeek(state: AppState, today = new Date()): CalendarWeek {
  const start = mondayOf(today);
  const todayKey = dayKey(today);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(start, index);
    const key = dayKey(date);
    return {
      key,
      label: WEEKDAY_LABELS[index],
      numeral: date.getDate(),
      cleared: state.activity[key] ?? 0,
      focus: state.focusByDay[key] ?? 0,
      isToday: key === todayKey,
      future: key > todayKey,
    };
  });

  return {
    start,
    days,
    cleared: days.reduce((sum, day) => sum + day.cleared, 0),
    focus: days.reduce((sum, day) => sum + day.focus, 0),
    activeDays: days.filter((day) => day.cleared > 0).length,
  };
}

/**
 * Longest unbroken run of days with at least one clear. Walked by calendar
 * rather than by the keys present in `activity`, because a gap day is simply
 * absent — counting consecutive keys would report a streak straight through
 * weeks where nothing happened.
 */
export function longestRun(state: AppState): number {
  const hit = new Set(
    Object.keys(state.activity).filter((key) => (state.activity[key] ?? 0) > 0),
  );
  if (hit.size === 0) return 0;

  let best = 0;
  for (const key of hit) {
    if (hit.has(shiftKey(key, -1))) continue;
    let run = 1;
    let cursor = key;
    while (hit.has((cursor = shiftKey(cursor, 1)))) run += 1;
    best = Math.max(best, run);
  }
  return best;
}

function shiftKey(key: string, days: number): string {
  return dayKey(shiftDate(new Date(`${key}T00:00:00`), days));
}

/** Days elapsed in the calendar week — used to label a partial week honestly. */
export function weekDaysElapsed(today = new Date()): number {
  return ((today.getDay() + 6) % 7) + 1;
}

export interface VelocityStats {
  perDay: number;
  activeDays: number;
  trend: number;
}

/** Quests cleared per day across the trailing week, plus week-on-week delta. */
export function velocityStats(state: AppState): VelocityStats {
  const series = daySeries(state, 14);
  const current = series.slice(-7);
  const previous = series.slice(0, 7);
  const currentTotal = current.reduce((sum, day) => sum + day.completed, 0);
  const previousTotal = previous.reduce((sum, day) => sum + day.completed, 0);
  const activeDays = current.filter((day) => day.completed > 0 || day.focus > 0).length;
  return {
    perDay: Math.round((currentTotal / 7) * 10) / 10,
    activeDays,
    trend: currentTotal - previousTotal,
  };
}

export interface FocusStats {
  today: number;
  thisWeek: number;
  allTime: number;
}

export function focusStats(state: AppState): FocusStats {
  const keys = daySeries(state, 7).map((day) => day.key);
  return {
    today: state.focusByDay[dayKey()] ?? 0,
    thisWeek: sumBy(keys, state.focusByDay),
    allTime: state.focusMinutes,
  };
}

export interface GoalStats {
  done: number;
  target: number;
  pct: number;
  met: boolean;
}

export function goalStats(state: AppState): GoalStats {
  const done = state.activity[dayKey()] ?? 0;
  const target = state.dailyGoal > 0 ? state.dailyGoal : 3;
  return {
    done,
    target,
    pct: Math.min(100, Math.round((done / target) * 100)),
    met: done >= target,
  };
}
