"use client";

import { motion } from "motion/react";
import { ArrowRight, Coins, Flame, PanelRightClose, Sparkles, Timer, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { BOSS_HP_MAX } from "@/lib/constants";
import { dayKey } from "@/lib/dates";
import { goalStats, focusStats } from "@/lib/metrics";
import { softSpring, EASE_SIGNATURE } from "@/lib/motion";
import type { ViewId } from "@/lib/views";

/**
 * The third pane. Not a chat — a counsel surface that reads the same state the
 * rest of the app does and offers the next move, with the numbers that justify
 * it. Every row is an action, so the pane never promises an answer it cannot give.
 */
export default function AssistRail({
  reduced,
  onGo,
  onOpenShop,
  onCollapse,
}: {
  reduced: boolean;
  onGo: (view: ViewId) => void;
  onOpenShop: () => void;
  onCollapse: () => void;
}) {
  const { state, level, streak } = useStore();
  const sfx = useSfx();

  const goal = goalStats(state);
  const focus = focusStats(state);
  const open = state.tasks.filter((task) => !task.completed);
  const overdue = open.filter((task => task.due && task.due < dayKey()));
  const hardest = [...open].sort((a, b) => {
    const weight = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
    return weight[a.priority] - weight[b.priority];
  })[0];

  const advice = overdue.length
    ? {
        kicker: "Overdue",
        headline: `${overdue.length} ${overdue.length === 1 ? "quest is" : "quests are"} past their date.`,
        detail: overdue[0].text,
        action: "Open the board",
        run: () => onGo("quests"),
      }
    : !goal.met
      ? {
          kicker: "Today",
          headline: `${goal.target - goal.done} more ${goal.target - goal.done === 1 ? "quest clears" : "quests clear"} the daily goal.`,
          detail: hardest ? `Heaviest open: ${hardest.text}` : "Nothing captured yet — capture one and it counts.",
          action: "Capture a quest",
          run: () => onGo("quests"),
        }
      : streak === 0
        ? {
            kicker: "Streak",
            headline: "The chain is not lit yet today.",
            detail: "One cleared quest lights it; a shield forgives one miss.",
            action: "Spend gold on a shield",
            run: onOpenShop,
          }
        : {
            kicker: "Standing",
            headline: "Goal met and the chain is alive.",
            detail: `Dragon at ${state.bossHp} of ${BOSS_HP_MAX} HP · ${focus.today} focused minutes today.`,
            action: "See the trend",
            run: () => onGo("progress"),
          };

  return (
    <aside className="assist" aria-label="Counsel">
      <header className="assist-head">
        <div>
          <p className="kicker">Counsel</p>
          <h2>{level.name}</h2>
        </div>
        <button
          type="button"
          className="assist-close"
          onClick={onCollapse}
          aria-label="Hide counsel panel"
          title="Hide counsel (⌥J)"
        >
          <PanelRightClose size={14} aria-hidden />
        </button>
      </header>

      <motion.section
        className="assist-card hero-surface"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_SIGNATURE }}
      >
        <p className="kicker">{advice.kicker}</p>
        <strong className="assist-headline">{advice.headline}</strong>
        <p className="assist-detail">{advice.detail}</p>
        <button
          type="button"
          className="assist-action"
          onClick={() => {
            sfx("nav");
            advice.run();
          }}
        >
          {advice.action}
          <ArrowRight size={13} aria-hidden />
        </button>
      </motion.section>

      <div className="assist-jumps" role="group" aria-label="Quick moves">
        <button type="button" onClick={() => { sfx("nav"); onGo("focus"); }}>
          <Timer size={13} aria-hidden />
          Plan a focus session
        </button>
        <button type="button" onClick={() => { sfx("nav"); onGo("lair"); }}>
          <Flame size={13} aria-hidden />
          How is the dragon holding?
        </button>
        <button type="button" onClick={onOpenShop}>
          <Coins size={13} aria-hidden />
          What can {state.gold} gold buy?
        </button>
        <button type="button" onClick={() => { sfx("nav"); onGo("progress"); }}>
          <TrendingUp size={13} aria-hidden />
          Where am I slipping?
        </button>
      </div>

      <dl className="assist-stats">
        <div>
          <dt>Goal</dt>
          <dd>
            {goal.done}/{goal.target}
          </dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{streak}d</dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>{focus.today}m</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{open.length}</dd>
        </div>
      </dl>

      <p className="assist-foot">
        <Sparkles size={11} aria-hidden />
        {level.nextName
          ? `${level.toNext} XP to ${level.nextName}.`
          : "Top rank held — the ledger keeps counting."}
      </p>
    </aside>
  );
}
