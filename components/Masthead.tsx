"use client";

import { motion } from "motion/react";
import { Flame } from "lucide-react";
import type { CompletionStats, GoalStats } from "@/lib/metrics";
import { BOSS_HP_MAX } from "@/lib/constants";
import { EASE_SIGNATURE, meterTransition } from "@/lib/motion";

interface MastheadProps {
  reduced: boolean;
  greeting: string;
  dateLabel: string;
  cleared: CompletionStats;
  goal: GoalStats;
  streak: number;
  xp: number;
  levelName: string;
  toNext: number;
  bossHp: number;
  shielded: boolean;
}

/**
 * Home's opening statement. A campaign page should lead with intent — what
 * the day costs and what the week looks like — so the four ledger numbers sit
 * inside this surface instead of competing as four identical stat tiles.
 */
export default function Masthead({
  reduced,
  greeting,
  dateLabel,
  cleared,
  goal,
  streak,
  xp,
  levelName,
  toNext,
  bossHp,
  shielded,
}: MastheadProps) {
  const remaining = Math.max(0, goal.target - goal.done);
  const headline = goal.met
    ? "The day is paid for."
    : remaining === 1
      ? "One quest stands between you and a cleared ledger."
      : `${remaining} quests stand between you and a cleared ledger.`;

  const pips = Math.min(10, Math.max(goal.target, 1));
  const dragonFrac = Math.max(0, Math.min(1, bossHp / BOSS_HP_MAX));

  return (
    <section className="masthead hero-surface span-all" aria-label={greeting}>
      <div className="masthead-main">
        <p className="kicker">Campaign ledger · {dateLabel}</p>

        <span className="masthead-mask">
          <motion.h1
            className="masthead-title"
            initial={reduced ? false : { y: "108%" }}
            animate={reduced ? undefined : { y: 0 }}
            transition={reduced ? undefined : { duration: 0.66, ease: EASE_SIGNATURE }}
          >
            {headline}
          </motion.h1>
        </span>

        <p className="masthead-lead">
          {levelName} · {cleared.open} open · {xp} XP banked
          {toNext > 0 ? ` · ${toNext} to next rank` : ""}
        </p>

        <div
          className="masthead-dragon"
          title={`${bossHp} of ${BOSS_HP_MAX} hit points left on the dragon this week`}
        >
          <Flame size={14} aria-hidden className="masthead-dragon-icon" />
          <span className="masthead-dragon-copy">
            <span className="kicker">Warden&apos;s residue</span>
            <strong className="masthead-dragon-value">
              {bossHp}
              <em>/{BOSS_HP_MAX} HP</em>
            </strong>
          </span>
          <span className="masthead-dragon-track" aria-hidden>
            <motion.span
              className="meridian-fill"
              data-kind="ember"
              initial={false}
              animate={{ scaleX: dragonFrac }}
              transition={meterTransition(reduced)}
            />
          </span>
          <span className="masthead-dragon-foot">
            Every cleared quest strikes it for its XP value, 10 to 30.
          </span>
        </div>
      </div>

      <div className="masthead-ledger">
        <div
          className="waffle"
          role="img"
          aria-label={`${goal.done} of ${goal.target} quests cleared toward today's goal`}
        >
          {Array.from({ length: pips }, (_, index) => {
            const filled = index < Math.min(goal.done, pips);
            return (
              <motion.span
                key={index}
                className="waffle-pip"
                data-filled={filled || undefined}
                initial={reduced ? false : { opacity: 0.25, scale: 0.7 }}
                animate={{ opacity: 1, scale: filled && !reduced ? 1.06 : 1 }}
                transition={{
                  duration: 0.4,
                  delay: reduced ? 0 : 0.12 + index * 0.045,
                  ease: EASE_SIGNATURE,
                }}
              />
            );
          })}
          {goal.target > pips && (
            <span className="waffle-more font-meta">+{goal.target - pips}</span>
          )}
        </div>
        <p className="waffle-caption">
          {goal.done} of {goal.target} today · {goal.met ? "goal met" : `${remaining} to go`}
        </p>

        <dl className="masthead-stats">
          <div className="masthead-stat">
            <dt>Quests completed</dt>
            <dd>
              {cleared.today}
              <span>today</span>
            </dd>
            <small>
              {cleared.allTime} all-time · {cleared.thisWeek} this week
            </small>
          </div>
          <div className="masthead-stat">
            <dt>Current streak</dt>
            <dd>
              {streak}
              <span>days</span>
            </dd>
            <small>
              {shielded ? "Shield active — one miss is forgiven." : "One cleared quest keeps the chain."}
            </small>
          </div>
          <div className="masthead-stat">
            <dt>Experience</dt>
            <dd>
              {xp}
              <span>xp</span>
            </dd>
            <small>{toNext > 0 ? `${toNext} XP to ${levelName}` : "Highest rank held"}</small>
          </div>
          <div className="masthead-stat">
            <dt>Daily goal</dt>
            <dd>
              {goal.pct}
              <span>%</span>
            </dd>
            <small>{goal.done} of {goal.target} quests cleared</small>
          </div>
        </dl>
      </div>
    </section>
  );
}
