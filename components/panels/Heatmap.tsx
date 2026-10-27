"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { CalendarDays } from "lucide-react";
import Panel from "../ui/Panel";
import { useStore } from "@/lib/store";
import { dayKey, shiftDate } from "@/lib/dates";

const DAYS = 365;

/** Five steps, deliberately not a linear ramp: a single quest has to read. */
function tierOf(count: number): number {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

interface Day {
  key: string;
  count: number;
  isToday: boolean;
}

interface Week {
  key: string;
  monthLabel: string | null;
  days: Day[];
}

export default function Heatmap({ reduced }: { reduced: boolean }) {
  const { state, streak } = useStore();

  const weeks = useMemo<Week[]>(() => {
    const today = new Date();
    const todayKey = dayKey(today);
    /* Start on the Monday of the oldest visible week so columns align. */
    const start = shiftDate(today, -(DAYS - 1));
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const flat: (Day & { month: string })[] = [];
    for (let offset = 0; ; offset++) {
      const date = shiftDate(start, offset);
      if (date > today) break;
      const key = dayKey(date);
      flat.push({
        key,
        count: state.activity[key] ?? 0,
        isToday: key === todayKey,
        month: date.toLocaleDateString("en-GB", { month: "short" }),
      });
    }

    const out: Week[] = [];
    let lastMonth = "";
    for (let index = 0; index < flat.length; index += 7) {
      const chunk = flat.slice(index, index + 7);
      const monthLabel = chunk[0].month !== lastMonth ? chunk[0].month : null;
      lastMonth = chunk[0].month;
      out.push({
        key: chunk[0].key,
        monthLabel,
        days: chunk.map(({ month: _month, ...day }) => day),
      });
    }
    return out;
  }, [state.activity]);

  const activeDays = weeks.reduce(
    (sum, week) => sum + week.days.filter((day) => day.count > 0).length,
    0,
  );

  return (
    <Panel
      kicker="Consistency"
      title="Consistency map"
      icon={<CalendarDays size={15} />}
      actions={
        <span className="font-meta text-[12px] text-muted tabular-nums">
          {activeDays} active days · {streak}-day streak
        </span>
      }
      reduced={reduced}
    >
      <div className="heatmap">
        <div className="heatmap-scroll">
          <div className="heatmap-months" aria-hidden>
            {weeks.map((week) => (
              <span key={`month-${week.key}`} className="heatmap-month">
                {week.monthLabel ?? ""}
              </span>
            ))}
          </div>

          <div className="heatmap-body">
            <div className="heatmap-days" aria-hidden>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="heatmap-cells">
              {weeks.map((week, weekIndex) => (
                <div key={week.key} className="heatmap-week">
                  {week.days.map((day) => (
                    <motion.span
                      key={day.key}
                      className="heatcell"
                      data-tier={tierOf(day.count)}
                      data-today={day.isToday || undefined}
                      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.22,
                        // Columns cascade left to right instead of 365 simultaneous tweens.
                        delay: Math.min(0.5, weekIndex * 0.008),
                      }}
                      title={`${day.key} · ${day.count} completed`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-legend">
          <span className="heatmap-scale">
            {[0, 1, 3, 5, 7].map((count) => (
              <span key={count} className="heatmap-step">
                <i className="heatcell" data-tier={tierOf(count)} aria-hidden />
                {count === 7 ? "6+" : count}
              </span>
            ))}
          </span>
          <span className="heatmap-hint">Upper tiers carry a hatch, so the scale reads in colour or out.</span>
        </div>
      </div>
    </Panel>
  );
}
