export const VIEWS = ["home", "quests", "progress", "focus", "lair"] as const;

export type ViewId = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<ViewId, string> = {
  home: "Home",
  quests: "Quest board",
  progress: "Progress",
  focus: "Focus mode",
  lair: "The Lair",
};

/** Thumb-scale labels for the phone dock, where "Quest board" will not fit. */
export const VIEW_SHORT: Record<ViewId, string> = {
  home: "Home",
  quests: "Board",
  progress: "Progress",
  focus: "Focus",
  lair: "Lair",
};

export const VIEW_SUBTITLES: Record<ViewId, string> = {
  home: "Today's telemetry and a single place to capture.",
  quests: "Capture, triage and clear your quests.",
  progress: "Consistency, momentum, rank and rewards.",
  focus: "One timer, one thing, every mode.",
  lair: "The Procrastination Dragon and your companion.",
};

const SHORTCUTS: Record<string, ViewId> = {
  "1": "home",
  "2": "quests",
  "3": "progress",
  "4": "focus",
  "5": "lair",
};

export function viewFromHash(raw: string | null | undefined): ViewId | null {
  const key = (raw ?? "").replace(/^#/, "");
  return (VIEWS as readonly string[]).includes(key) ? (key as ViewId) : null;
}

export function viewFromShortcut(key: string): ViewId | null {
  return SHORTCUTS[key] ?? null;
}
