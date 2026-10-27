"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import Panel from "../ui/Panel";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { dayKey, dayOffset, monthGrid, monthLabel } from "@/lib/dates";
import { CHART_RHYTHM, EASE_SIGNATURE, chartDelay } from "@/lib/motion";
import { useToast } from "@/lib/toast";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-bad",
  high: "bg-red",
  medium: "bg-warn",
  low: "bg-good",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function UpcomingList({ reduced }: { reduced: boolean }) {
  const { state, setStatus } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  /* One pass over the tasks gives the grid its load marks and the agenda its
     rows, so the two can never disagree about what is scheduled. */
  const byDay = useMemo(() => {
    const map = new Map<string, { open: number; overdue: boolean }>();
    for (const task of state.tasks) {
      if (task.completed || !task.due) continue;
      const entry = map.get(task.due) ?? { open: 0, overdue: false };
      entry.open += 1;
      if ((dayOffset(task.due) ?? 0) < 0) entry.overdue = true;
      map.set(task.due, entry);
    }
    return map;
  }, [state.tasks]);

  const agenda = useMemo(() => {
    const open = state.tasks.filter((task) => !task.completed && task.due);
    const rows = selected
      ? open.filter((task) => task.due === selected)
      : open.filter((task) => (dayOffset(task.due) ?? 999) >= 0);
    return rows
      .map((task) => ({ task, offset: dayOffset(task.due) ?? 999 }))
      .sort((a, b) => a.offset - b.offset || a.task.text.localeCompare(b.task.text))
      .slice(0, 5);
  }, [state.tasks, selected]);

  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const todayKey = dayKey();

  const page = (months: number) => {
    sfx("nav");
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));
  };

  return (
    <Panel
      kicker="Schedule"
      title="Coming up next"
      icon={<CalendarClock size={15} />}
      reduced={reduced}
      actions={
        <div className="cal-nav">
          <button type="button" onClick={() => page(-1)} aria-label="Previous month">
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span>{monthLabel(cursor)}</span>
          <button type="button" onClick={() => page(1)} aria-label="Next month">
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="cal" role="grid" aria-label={`${monthLabel(cursor)} due dates`}>
        <div className="cal-row cal-rail" role="row">
          {WEEKDAYS.map((day) => (
            <span key={day} role="columnheader">
              {day}
            </span>
          ))}
        </div>

        {Array.from({ length: 6 }, (_, week) => (
          <div className="cal-row" role="row" key={week}>
            {cells.slice(week * 7, week * 7 + 7).map((date) => {
              const key = dayKey(date);
              const entry = byDay.get(key);
              const outside = date.getMonth() !== cursor.getMonth();
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={key}
                  disabled={!entry}
                  data-outside={outside || undefined}
                  data-today={isToday || undefined}
                  data-overdue={entry?.overdue || undefined}
                  aria-pressed={isSelected}
                  aria-label={
                    entry
                      ? `${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — ${entry.open} ${entry.open === 1 ? "quest" : "quests"}`
                      : date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })
                  }
                  onClick={() => {
                    sfx("tap");
                    setSelected(isSelected ? null : key);
                  }}
                >
                  <span className="cal-day">{date.getDate()}</span>
                  {entry && <span className="cal-load">{entry.open}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected && (
        <button type="button" className="cal-clear" onClick={() => setSelected(null)}>
          {new Date(`${selected}T00:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          <span className="text-faint">clear</span>
        </button>
      )}

      {agenda.length === 0 ? (
        <p className="py-4 text-[12px] leading-relaxed text-muted">
          {selected
            ? "Nothing due on this day. Pick another marked date."
            : "Nothing scheduled ahead. Add a date with "}
          {!selected && (
            <>
              <span className="font-meta text-accent">@2026-11-02</span> or{" "}
              <span className="font-meta text-accent">@today</span>.
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {agenda.map(({ task, offset }, index) => (
            <motion.li
              key={task.id}
              className="flex items-center gap-2.5 py-2.5"
              initial={reduced ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: chartDelay(index), duration: CHART_RHYTHM.duration, ease: EASE_SIGNATURE }}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-md bg-accent/12 text-[10px] font-bold text-accent tabular-nums ${
                  offset < 0 ? "bg-bad/15 text-bad" : offset === 0 ? "bg-warn/15 text-warn" : ""
                }`}
                aria-hidden
              >
                {offset < 0 ? "!" : offset === 0 ? "now" : `${offset}d`}
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setStatus(task.id, "done");
                  sfx("check");
                  push(`+${task.priority === "urgent" ? 30 : 15} XP · cleared`);
                }}
              >
                <span className="block truncate text-[12.5px] font-semibold hover:text-accent">
                  {task.text}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  {offset < 0
                    ? `Overdue by ${Math.abs(offset)}d`
                    : task.due}
                </span>
              </button>
              <span
                className={`size-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                title={task.priority}
              />
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
