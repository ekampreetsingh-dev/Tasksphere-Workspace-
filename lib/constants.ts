import type { Category, Mode, Priority } from "./types";

export const XP_BY_PRIORITY: Record<Priority, number> = {
  low: 10,
  medium: 15,
  high: 20,
  urgent: 30,
};

/** The dragon's weekly pool. Reset every Monday by applyDailyRules(). */
export const BOSS_HP_MAX = 500;

export const RANKS = [
  { level: 1, xp: 0, name: "Ember Initiate" },
  { level: 2, xp: 250, name: "Spark Adept" },
  { level: 3, xp: 500, name: "Ironquill Scribe" },
  { level: 4, xp: 750, name: "Dawnwarden" },
  { level: 5, xp: 1000, name: "Stormcaller" },
  { level: 6, xp: 1400, name: "Veilbreaker" },
  { level: 7, xp: 1900, name: "Starforged Vanguard" },
  { level: 8, xp: 2500, name: "Eclipse Sentinel" },
  { level: 9, xp: 3200, name: "Aether Architect" },
  { level: 10, xp: 4000, name: "Zenith Paragon" },
  { level: 11, xp: 5000, name: "Mythic Sovereign" },
  { level: 12, xp: 6200, name: "Eternal Ascendant" },
] as const;

export const CATEGORIES: Record<Category, string> = {
  study: "Study",
  work: "Work",
  wellness: "Wellness",
  life: "Life admin",
};

export const MODES: Record<Mode, string> = {
  light: "Daylight",
  cyber: "Forge (dark)",
  zen: "Zen / Botanical",
  retro: "Synthwave Retro",
  brutalist: "Brutalist Architect",
};

/** Palette skins. `colors` are swatch previews only; the real tokens live in
   globals.css under body[data-theme]. */
export const SHOP_THEMES = [
  {
    id: "default",
    name: "Forge & Ledger",
    level: 1,
    cost: 0,
    colors: ["#100e0c", "#c9a962", "#57b894"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    level: 2,
    cost: 40,
    colors: ["#060b14", "#42e8f5", "#ff5686"],
  },
  {
    id: "amoled",
    name: "Midnight AMOLED",
    level: 3,
    cost: 80,
    colors: ["#000000", "#34d399", "#0a0a0a"],
  },
  {
    id: "sunset",
    name: "Sunset Gold",
    level: 4,
    cost: 120,
    colors: ["#150c1c", "#fbbf36", "#f97316"],
  },
];

export interface Supply {
  id: string;
  name: string;
  detail: string;
  cost: number;
  /** companion energy restored */
  energy?: number;
  /** re-arms the automatic missed-day save */
  shield?: boolean;
}

/**
 * Consumables bought with gold. Carried over from the shipped build so the
 * economy the old users learned still holds: energy for the companion, and the
 * one-miss forgiveness that protects a streak.
 */
export const SHOP_SUPPLIES: Supply[] = [
  {
    id: "glowberry",
    name: "Glowberry Snack",
    detail: "Restores a quarter of your companion's energy.",
    cost: 12,
    energy: 25,
  },
  {
    id: "starfruit",
    name: "Starfruit Feast",
    detail: "Half its energy back in a single sitting.",
    cost: 22,
    energy: 50,
  },
  {
    id: "shield",
    name: "Streak Shield Recharge",
    detail: "Re-arms the automatic missed-day save.",
    cost: 45,
    shield: true,
  },
];

export interface Purchase {
  id: string;
  name: string;
  cost: number;
  energy?: number;
  shield?: boolean;
  /** palette id to unlock and equip */
  skin?: string;
  requiredLevel?: number;
}

export const PET_STAGES = [
  { name: "Dormant Egg", summary: "Sealed and waiting" },
  { name: "Stirring Egg", summary: "Cracks are spreading" },
  { name: "Ember Hatchling", summary: "Freshly hatched" },
  { name: "Skywing Fledgling", summary: "Wings are growing in" },
  { name: "Stormscale Drake", summary: "Crested and fast" },
  { name: "Celestial Wyrm", summary: "Fully ascended" },
];

export type Rank = (typeof RANKS)[number];

export function petStageFor(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  if (level <= 4) return 2;
  if (level <= 6) return 3;
  if (level <= 9) return 4;
  return 5;
}

export function levelInfo(xp: number) {
  let current: Rank = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.xp) current = rank;
  }
  const next = RANKS.find((rank) => rank.level === current.level + 1) ?? null;
  const span = next ? next.xp - current.xp : 1;
  const earned = next ? xp - current.xp : span;
  return {
    level: current.level,
    name: current.name,
    nextName: next?.name ?? null,
    toNext: next ? next.xp - xp : 0,
    progress: Math.max(0, Math.min(1, earned / span)),
  };
}
