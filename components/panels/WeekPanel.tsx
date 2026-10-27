"use client";

import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { calendarWeek, weekDaysElapsed } from "@/lib/metrics";
import { CHART_RHYTHM, EASE_SIGNATURE, chartDelay } from "@/lib/motion";

/**
 * One panel for the current week: the shape of the bars, the date of each
 * column, and the totals in the header. It replaces the old strip-plus-chart
 * pair, which drew the same seven days twice and disagreed about what
 * "this week" meant.
 */
export default function WeekPanel({ reduced }: { reduced: boolean }) {
  const { state, streak } = useStore();
  const week = calendarWeek(state);
  const peak = Math.max(1, ...week.days.map((day) => day.cleared));
  const elapsed = weekDaysElapsed();

  return (
    <section className="weekpanel" aria-label="This week">
      <header className="weekpanel-head">
        <div>
          <p className="kicker">
            Week of {week.start.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </p>
          <h2>{week.cleared} cleared</h2>
        </div>
        <dl className="weekpanel-totals">
          <div>
            <dt>Active</dt>
            <dd>
              {week.activeDays}/{elapsed}
            </dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{week.focus}m</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{streak}d</dd>
          </div>
        </dl>
      </header>

      <ol className="weekpanel-bars">
        {week.days.map((day, index) => (
          <motion.li
            key={day.key}
            className="weekpanel-col"
            data-today={day.isToday || undefined}
            data-future={day.future || undefined}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: CHART_RHYTHM.duration, delay: chartDelay(index), ease: EASE_SIGNATURE }}
            title={`${day.key} · ${day.cleared} cleared · ${day.focus} focused minutes`}
          >
            <span className="weekpanel-value">
              {day.future ? "" : day.cleared > 0 ? day.cleared : "–"}
            </span>
            <span className="weekpanel-track">
              <motion.i
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
            transition={{ duration: CHART_RHYTHM.duration, delay: chartDelay(index), ease: EASE_SIGNATURE }}
                style={{
                  height: `${day.cleared === 0 ? 2 : Math.max(8, (day.cleared / peak) * 100)}%`,
                  transformOrigin: "bottom",
                }}
              />
            </span>
            <span className="weekpanel-day">
              <em>{day.label}</em>
              <b>{day.numeral}</b>
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
