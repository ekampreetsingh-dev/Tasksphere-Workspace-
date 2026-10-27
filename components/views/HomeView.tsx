"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Coins,
  Gauge,
  Sword,
  Timer,
} from "lucide-react";
import Masthead from "../Masthead";
import Tile from "../ui/Tile";
import Panel from "../ui/Panel";
import QuestComposer from "../QuestComposer";
import StreakShield from "../panels/StreakShield";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { dayKey } from "@/lib/dates";
import {
  completionRate,
  completionStats,
  daySeries,
  focusStats,
  goalStats,
  velocityStats,
} from "@/lib/metrics";
import type { ViewId } from "@/lib/views";
import { centerOf, softSpring } from "@/lib/motion";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-bad",
  high: "bg-red",
  medium: "bg-warn",
  low: "bg-good",
};

export default function HomeView({
  reduced,
  onGo,
}: {
  reduced: boolean;
  onGo: (view: ViewId) => void;
}) {
  const { state, level, streak, toggleTask } = useStore();
  const { push } = useToast();
  const sfx = useSfx();

  const series = useMemo(() => daySeries(state, 14), [state]);
  const cleared = completionStats(state);
  const goal = goalStats(state);
  const velocity = velocityStats(state);
  const focus = focusStats(state);
  const rate = completionRate(state);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const shortlist = useMemo(() => {
    const open = state.tasks.filter((task) => !task.completed);
    const weight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...open]
      .sort((a, b) => {
        const due = (a.due ?? "9999") === (b.due ?? "9999")
          ? weight[a.priority] - weight[b.priority]
          : (a.due ?? "9999") < (b.due ?? "9999")
            ? -1
            : 1;
        return due;
      })
      .slice(0, 7);
  }, [state.tasks]);

  const inProgress = state.tasks.filter((task) => task.status === "progress" && !task.completed).length;

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="view-home">
      <Masthead
        reduced={reduced}
        greeting={greeting}
        dateLabel={dateLabel}
        cleared={cleared}
        goal={goal}
        streak={streak}
        xp={state.xp}
        levelName={level.name}
        toNext={level.toNext}
        bossHp={state.bossHp}
        shielded={state.shieldedDays.includes(dayKey()) || state.streakShield}
      />

      <section className="tile-band tile-band--tertiary span-all" aria-label="Trends">
        <Tile
          label="Focus time"
          value={focus.today}
          unit="min today"
          tone="info"
          icon={<Timer size={14} />}
          spark={series.slice(-7).map((day) => day.focus)}
          foot={`${focus.thisWeek} minutes this week · ${focus.allTime} all-time`}
          reduced={reduced}
        />
        <Tile
          label="Completion rate"
          value={rate}
          unit="%"
          tone="good"
          icon={<Gauge size={14} />}
          foot={`${cleared.cleared} done against ${cleared.open} still open`}
          reduced={reduced}
        />
        <Tile
          label="Active velocity"
          value={velocity.perDay}
          unit="/ day"
          tone="gold"
          icon={<Sword size={14} />}
          spark={series.slice(-7).map((day) => day.completed)}
          foot={
            velocity.trend === 0
              ? `Flat week-on-week · ${velocity.activeDays} active days`
              : `${velocity.trend > 0 ? "+" : ""}${velocity.trend} vs last week · ${velocity.activeDays} active days`
          }
          reduced={reduced}
        />
      </section>

      <div className="stack">
        <Panel kicker="Capture" title="Add quest" reduced={reduced} reveal={false}>
          <QuestComposer reduced={reduced} />
        </Panel>

        <Panel
          kicker="Triage"
          title="Up next"
          icon={<Sword size={15} />}
          reduced={reduced}
          reveal={false}
          actions={
            <button
              type="button"
              onClick={() => {
                sfx("nav");
                onGo("quests");
              }}
              className="flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              Open board
              <ArrowRight size={12} aria-hidden />
            </button>
          }
        >
          {shortlist.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-muted">
              Nothing is open. Capture a quest above and it lands on the board.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {shortlist.map((task) => (
                <li key={task.id}>
                  <motion.button
                    type="button"
                    onClick={(event) => {
                      const gains = toggleTask(task.id, centerOf(event.currentTarget));
                      if (gains) {
                        sfx("check");
                        push(`+${gains.xpGain} XP · +${gains.goldGain} gold`);
                      }
                    }}
                    whileTap={reduced ? undefined : { scale: 0.985 }}
                    transition={softSpring}
                    className="group flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:border-line-strong"
                  >
                    <span className={`size-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{task.text}</span>
                    {task.due && <span className="shrink-0 font-meta text-[10.5px] text-faint">{task.due.slice(5)}</span>}
                    <span className="grid size-4 shrink-0 place-items-center rounded-[5px] border border-line text-[9px] text-faint transition-colors group-hover:border-accent group-hover:text-accent">
                      <Check size={10} aria-hidden />
                    </span>
                  </motion.button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <aside className="stack">
        <StreakShield reduced={reduced} />

        <Panel kicker="Command" title="Jump to" reduced={reduced} reveal={false}>
          <div className="grid gap-2">
            <CommandLink
              label="Quest board"
              hint={`${cleared.open} open · ${inProgress} in progress`}
              onClick={() => {
                sfx("nav");
                onGo("quests");
              }}
              reduced={reduced}
            />
            <CommandLink
              label="Focus mode"
              hint={`${state.focusDefault}-minute default · ${focus.today}m banked today`}
              onClick={() => {
                sfx("nav");
                onGo("focus");
              }}
              reduced={reduced}
            />
            <CommandLink
              label="The Lair"
              hint={`${Math.max(0, 500 - state.bossHp)} damage dealt this week`}
              onClick={() => {
                sfx("nav");
                onGo("lair");
              }}
              reduced={reduced}
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
            <Coins size={11} aria-hidden className="text-gold" />
            Gold is spent on shields and workspace skins.
          </p>
        </Panel>
      </aside>
    </div>
  );
}

function CommandLink({
  label,
  hint,
  onClick,
  reduced,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduced ? undefined : { x: 3 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      transition={softSpring}
      className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-accent"
    >
      <span className="min-w-0 flex-1">
        <strong className="block text-[12.5px]">{label}</strong>
        <small className="block truncate text-[11px] text-muted">{hint}</small>
      </span>
      <ArrowRight size={13} aria-hidden className="shrink-0 text-accent" />
    </motion.button>
  );
}
