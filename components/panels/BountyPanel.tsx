"use client";

import { motion } from "motion/react";
import { Coins, Crosshair, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { meterTransition } from "@/lib/motion";
import { dayKey } from "@/lib/dates";

const REWARD = 20;

/**
 * The one dark surface on a light page. It carries its own tokens instead of
 * the active skin's, because the contrast against the white grid is the point —
 * it is where the game layer shows through the work layer.
 */
export default function BountyPanel({ reduced }: { reduced: boolean }) {
  const { state, setPref } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const target = state.dailyGoal > 0 ? state.dailyGoal : 3;
  const today = dayKey();
  const done = state.activity[today] ?? 0;
  const claimed = Number(state.bounties[today] ?? 0) >= REWARD;
  const ready = done >= target && !claimed;
  const xpToday = done * 15;

  return (
    <section className={`bounty${ready ? " bounty--ready" : ""}`}>
      <span className="bounty-orb" aria-hidden />

      <header className="bounty-head">
        <span className="bounty-mark" aria-hidden>
          <Crosshair size={14} />
        </span>
        <h2>Daily Bounty</h2>
        <span className="bounty-state" data-claimed={claimed || undefined}>
          {claimed ? "Claimed" : ready ? "Ready" : "Live"}
        </span>
      </header>

      <p className="bounty-lead">
        Clear {target} quests today for {REWARD} gold.
      </p>

      <div className="bounty-figure">
        <div>
          <strong className="bounty-num">{xpToday}</strong>
          <span className="bounty-unit">XP banked</span>
        </div>
        <span className="bounty-pill">
          <Coins size={11} aria-hidden />+{REWARD} gold
        </span>
      </div>

      <div
        className="bounty-bar"
        role="progressbar"
        aria-valuenow={Math.round(Math.min(100, (done / target) * 100))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily bounty progress"
      >
        <motion.span
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: Math.min(1, done / target) }}
          transition={meterTransition(reduced)}
        />
      </div>

      <div className="bounty-tally">
        <span className="tabular-nums">
          {Math.min(done, target)}/{target} quests
        </span>
        <strong className="tabular-nums">{state.gold} gold held</strong>
      </div>

      <motion.button
        type="button"
        disabled={!ready}
        onClick={() => {
          setPref({
            gold: state.gold + REWARD,
            bounties: { ...state.bounties, [today]: REWARD },
          });
          sfx("claim");
          push(`Bounty claimed: +${REWARD} gold`);
        }}
        animate={ready && !reduced ? { y: [0, -2, 0] } : { y: 0 }}
        transition={
          ready && !reduced
            ? { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
        className="bounty-claim"
      >
        <Sparkles size={13} aria-hidden />
        {claimed ? "Bounty claimed" : ready ? "Claim bounty" : "Keep going"}
      </motion.button>
    </section>
  );
}
