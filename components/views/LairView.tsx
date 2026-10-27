"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Heart, Skull, Sparkles, Swords } from "lucide-react";
import Panel from "../ui/Panel";
import RewardBurst from "../ui/RewardBurst";
import DragonMark from "../art/DragonMark";
import SpiritMark from "../art/SpiritMark";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { BOSS_HP_MAX, PET_STAGES, SHOP_THEMES } from "@/lib/constants";
import { meterTransition, softSpring } from "@/lib/motion";
import type { ViewId } from "@/lib/views";

/**
 * The Lair is the one tab where the artwork is the interface: the dragon fills
 * the frame and every number lives in a single glass card laid over it. The
 * stage carries its own dark tokens for the same reason the bounty does — it
 * has to read as a place, not as a panel that happens to be tall.
 */
export default function LairView({
  reduced,
  onGo,
}: {
  reduced: boolean;
  onGo: (view: ViewId) => void;
}) {
  const { state, setPref, level, petStage, purchase } = useStore();
  const { push } = useToast();
  const sfx = useSfx();

  const hp = Math.max(0, Math.min(BOSS_HP_MAX, state.bossHp));
  const hpPct = (hp / BOSS_HP_MAX) * 100;
  const fallen = hp <= 0;
  const previousHp = useRef(hp);
  const [strike, setStrike] = useState(false);

  useEffect(() => {
    const damaged = hp < previousHp.current;
    previousHp.current = hp;
    if (!damaged || reduced) return;
    setStrike(true);
    sfx("hit");
    const id = window.setTimeout(() => setStrike(false), 620);
    return () => window.clearTimeout(id);
  }, [hp, reduced, sfx]);

  /* One set of gold rules lives in the store, so the Lair and the reward store
     can never disagree about what a skin costs. */
  const buySkin = (skin: (typeof SHOP_THEMES)[number]) => {
    const result = purchase({
      id: skin.id,
      name: skin.name,
      cost: skin.cost,
      skin: skin.id,
      requiredLevel: skin.level,
    });
    sfx(result.ok ? "claim" : "error");
    push(result.message, result.ok ? "success" : "error");
  };

  /* The shipped economy, unchanged: a snack costs experience and buys back
     twenty energy. Tapping the orb used to hand out +1 for nothing, which made
     the shop supplies and the idle-day drain meaningless. */
  const FEED_COST = 10;
  const FEED_GAIN = 20;
  const claimedFull = state.petEnergy >= 100;

  const feedCompanion = () => {
    if (claimedFull) {
      sfx("tap");
      push("Your companion is already full.");
      return;
    }
    if (state.xp < FEED_COST) {
      sfx("error");
      push(`Earn ${FEED_COST} XP to feed your companion.`, "error");
      return;
    }
    setPref({
      xp: state.xp - FEED_COST,
      petEnergy: Math.min(100, state.petEnergy + FEED_GAIN),
    });
    sfx("claim");
    push("Your companion is feeling better.");
  };

  const nextStageIndex = Math.min(PET_STAGES.length - 1, petStage + 1);
  const energy = Math.round(state.petEnergy);

  return (
    <div className="view-lair">
      <section
        className="lair-stage"
        data-fallen={fallen ? "true" : "false"}
        aria-label="The Lair — Procrastination Dragon"
      >
        <span className="lair-sky" aria-hidden />
        <span className="lair-floor" aria-hidden />

        {!reduced && !fallen && (
          <div className="embers" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </div>
        )}

        <header className="lair-head">
          <span className="lair-mark" aria-hidden>
            <Swords size={15} />
          </span>
          <div className="min-w-0">
            <p className="lair-kicker">Weekly boss</p>
            <h1 className="lair-title">Procrastination Dragon</h1>
            <p className="lair-sub">
              {level.name} · {state.gold} gold · {state.unlockedThemes.length} skins owned
            </p>
          </div>
        </header>

        <span className="lair-state" data-fallen={fallen || undefined}>
          <Skull size={11} aria-hidden />
          {fallen ? "Slain" : `${Math.round(hpPct)}%`}
        </span>

        <motion.div
          className="lair-figure"
          animate={strike ? { x: [-9, 8, -4, 0], rotate: [-3.5, 2.6, 0] } : { x: 0, rotate: 0 }}
          transition={{ duration: 0.46, ease: "easeOut" }}
        >
          <div className="lair-figure-aura" aria-hidden />
          <DragonMark hpPct={hpPct} reduced={reduced} />
          <RewardBurst show={strike} tone="#f5a524" distance={64} />
        </motion.div>

        <div className="lair-mate">
          <div className="lair-orb" data-low={energy < 25 || undefined}>
            <SpiritMark stage={petStage} energy={state.petEnergy} reduced={reduced} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="lair-mate-kicker">Companion</p>
            <h2 className="lair-mate-name">{PET_STAGES[petStage].name}</h2>
            <div className="lair-glass-row">
              <span className="lair-glass-label">
                <Heart size={11} aria-hidden className="lair-glass-icon" />
                Energy
              </span>
              <strong className="lair-glass-value tabular-nums">{energy}%</strong>
            </div>
            <div
              className="lair-meter"
              role="progressbar"
              aria-label="Companion energy"
              aria-valuenow={energy}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.span
                data-tone="good"
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: energy / 100 }}
                transition={meterTransition(reduced)}
              />
            </div>
            <p className="lair-mate-note">
              {PET_STAGES[petStage].summary}. Cleared quests restore 8 each; an idle day drains 5.
            </p>
            <button
              type="button"
              className="lair-feed"
              disabled={claimedFull}
              onClick={feedCompanion}
            >
              <Sparkles size={13} aria-hidden />
              Feed · 10 XP
            </button>
          </div>
        </div>

        <div className="lair-glass">
          <div className="lair-glass-row">
            <span className="lair-glass-label">Vitality</span>
            <strong className="lair-glass-value tabular-nums">
              {hp}
              <span className="lair-glass-max">/{BOSS_HP_MAX}</span>
            </strong>
          </div>
          <div
            className="lair-meter"
            role="progressbar"
            aria-label="Dragon health"
            aria-valuenow={Math.round(hpPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.span
              data-tone="bad"
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: hpPct / 100 }}
              transition={meterTransition(reduced)}
            />
          </div>

          <div className="lair-glass-row">
            <span className="lair-glass-label">Damage dealt</span>
            <strong className="lair-glass-value tabular-nums">{BOSS_HP_MAX - hp}</strong>
          </div>

          <p className="lair-glass-note">
            {fallen
              ? "Slain. The week is yours — it returns at 500 HP on Monday."
              : "Every cleared quest strikes it for its XP value, 10 to 30. Resets each Monday."}
          </p>

          <div className="lair-glass-actions">
            <button
              type="button"
              onClick={() => {
                sfx("nav");
                onGo("quests");
              }}
              className="lair-cta"
            >
              <Swords size={13} aria-hidden />
              Take a swing
            </button>
            <button
              type="button"
              onClick={() => {
                sfx("nav");
                onGo("focus");
              }}
              className="lair-cta-ghost"
            >
              <Sparkles size={13} aria-hidden />
              Earn energy
            </button>
          </div>
        </div>
      </section>

      <div className="lair-wide stack">
        <Panel
          kicker="Evolution"
          title="Companion ladder"
          icon={<Heart size={15} />}
          reduced={reduced}
          actions={
            <span className="font-meta text-[11.5px] text-muted">
              {petStage >= PET_STAGES.length - 1
                ? "Fully ascended"
                : `Next: ${PET_STAGES[nextStageIndex].name}`}
            </span>
          }
        >
          <ol className="grid gap-2 min-md:grid-cols-2 min-xl:grid-cols-3">
            {PET_STAGES.map((stage, index) => {
              const reached = index <= petStage;
              const isCurrent = index === petStage;
              return (
                <li
                  key={stage.name}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    isCurrent
                      ? "border-accent bg-accent/8"
                      : reached
                        ? "border-line bg-surface-2"
                        : "border-line/60"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      reached ? "bg-accent text-[color:var(--on-accent)]" : "bg-surface-2 text-faint"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className={`block text-[12.5px] ${reached ? "" : "text-muted"}`}>
                      {stage.name}
                    </strong>
                    <small className="block text-[11px] text-faint">{stage.summary}</small>
                  </span>
                  {reached && (
                    <span className="text-accent" aria-hidden>
                      <Check size={13} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel
          kicker="Shop"
          title="Workspace skins"
          icon={<Sparkles size={15} />}
          reduced={reduced}
          actions={
            <span className="font-meta text-[11.5px] text-gold tabular-nums">
              {state.gold} gold
            </span>
          }
        >
          <ul className="grid gap-2.5 min-md:grid-cols-2 min-xl:grid-cols-3">
            {SHOP_THEMES.map((skin) => {
              const owned = state.unlockedThemes.includes(skin.id);
              const active = state.theme === skin.id;
              const locked = level.level < skin.level;
              return (
                <li key={skin.id}>
                  <motion.button
                    type="button"
                    onClick={() => buySkin(skin)}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.99 }}
                    transition={softSpring}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                      active
                        ? "border-accent bg-accent/8"
                        : "border-line bg-surface-2 hover:border-line-strong"
                    }`}
                  >
                    <span
                      className="size-10 shrink-0 rounded-lg border border-line"
                      style={{
                        background: `linear-gradient(135deg, ${skin.colors.join(", ")})`,
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[12.5px]">{skin.name}</strong>
                      <small className="block text-[11px] text-muted">
                        {owned
                          ? active
                            ? "Applied"
                            : "Owned"
                          : locked
                            ? `Rank ${skin.level} required`
                            : `${skin.cost} gold`}
                      </small>
                    </span>
                    {active && (
                      <span className="text-accent" aria-hidden>
                        <Check size={14} />
                      </span>
                    )}
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
