export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "progress" | "done";
export type Category = "study" | "work" | "wellness" | "life";
export type Mode = "light" | "cyber" | "zen" | "retro" | "brutalist";
export type MotionLevel = "full" | "subtle" | "reduced";

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  text: string;
  category: Category;
  priority: Priority;
  status: Status;
  tags: string[];
  created: number;
  completed: boolean;
  completedAt: number | null;
  subtasks: Subtask[];
  due?: string | null;
  /** Optional detail line. The board card shows it under the title. */
  note?: string;
}

export interface AppState {
  version: 2;
  tasks: Task[];
  xp: number;
  gold: number;
  unlockedThemes: string[];
  /** day key -> completed task count */
  activity: Record<string, number>;
  /** day key -> focused minutes */
  focusByDay: Record<string, number>;
  shieldedDays: string[];
  focusMinutes: number;
  petEnergy: number;
  bossHp: number;
  bossWeek: string;
  streakShield: boolean;
  shieldUsedOn: string;
  soundEnabled: boolean;
  minuteChime: boolean;
  awayChime: boolean;
  soundVolume: number;
  motionLevel: MotionLevel;
  focusDefault: number;
  /** Daily completion target the Home goal tile measures against. */
  dailyGoal: number;
  theme: string;
  uiMode: Mode;
  ambientSound: string;
  crtEnabled: boolean;
  bounties: Record<string, number>;
  lastDecay: number;
  focus: { minutes: number; mode: string };
  activityMode: string;
}
