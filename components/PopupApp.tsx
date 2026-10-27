"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ExternalLink, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { CATEGORIES } from "@/lib/constants";
import { dayKey } from "@/lib/dates";
import { goalStats } from "@/lib/metrics";
import { softSpring } from "@/lib/motion";
import type { Priority } from "@/lib/types";

const TONE: Record<Priority, string> = {
  urgent: "var(--red)",
  high: "var(--orange)",
  medium: "var(--blue)",
  low: "var(--green)",
};

/**
 * Extension popup. A thumb-scale surface for one question — what is still open
 * and can I clear it right now — so it deliberately omits the campaign chrome
 * the full app carries.
 */
export default function PopupApp() {
  const { state, streak, addTask, toggleTask } = useStore();
  const sfx = useSfx();
  const [tab, setTab] = useState<"today" | "board">("today");
  const [draft, setDraft] = useState("");

  const goal = goalStats(state);
  const open = useMemo(() => {
    const weight: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const list = state.tasks.filter((task) => !task.completed);
    return list.sort((a, b) => weight[a.priority] - weight[b.priority] || b.created - a.created);
  }, [state.tasks]);

  const done = state.tasks.filter((task) => task.completed);
  const rows = tab === "today" ? open.filter((t) => !t.due || t.due <= dayKey()) : open;
  const shown = rows.length > 0 ? rows : tab === "today" ? open.slice(0, 6) : [];

  const submit = () => {
    const task = addTask({ text: draft });
    if (task) {
      setDraft("");
      sfx("add");
    }
  };

  return (
    <div className="popup">
      <header className="popup-head">
        <span className="popup-brand">
          <Sparkles size={13} aria-hidden />
          TaskSphere
        </span>
        <span className="popup-seg" role="group" aria-label="Which list">
          <button type="button" aria-pressed={tab === "today"} onClick={() => setTab("today")}>
            Today
          </button>
          <button type="button" aria-pressed={tab === "board"} onClick={() => setTab("board")}>
            Board
          </button>
        </span>
      </header>

      <p className="popup-meta">
        {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        <span aria-hidden> · </span>
        {open.length} open
        <span aria-hidden> · </span>
        {streak}-day streak
      </p>

      <div className="popup-tiles">
        <div className="popup-tile" data-tone="accent">
          <strong>
            {goal.done}/{goal.target}
          </strong>
          <span>Cleared today</span>
        </div>
        <div className="popup-tile" data-tone="good">
          <strong>{streak}d</strong>
          <span>Streak running</span>
        </div>
      </div>

      <ul className="popup-list">
        <span
          className="popup-spine"
          style={{ "--fill": Math.min(1, goal.target ? goal.done / goal.target : 0) } as React.CSSProperties}
          aria-hidden
        />
        {shown.length === 0 && (
          <li className="popup-empty">
            {tab === "today" ? "Nothing due today. Add one below and it counts." : "The board is clear."}
          </li>
        )}
        {shown.map((task) => {
          const doneSubs = task.subtasks.filter((sub) => sub.done).length;
          return (
            <li key={task.id} className="popup-row">
              <button
                type="button"
                className="popup-check"
                onClick={() => {
                  toggleTask(task.id);
                  sfx("check");
                }}
                aria-label={`Complete ${task.text}`}
              >
                <Check size={11} aria-hidden />
              </button>
              <span className="popup-row-body">
                <strong>{task.text}</strong>
                <small>
                  {CATEGORIES[task.category]}
                  {task.subtasks.length > 0 && ` · ${doneSubs}/${task.subtasks.length}`}
                  {task.due && ` · due ${task.due.slice(5)}`}
                </small>
              </span>
              <span className="popup-tag" style={{ color: TONE[task.priority], borderColor: TONE[task.priority] }}>
                {task.priority}
              </span>
            </li>
          );
        })}

        {done.slice(0, 2).map((task) => (
          <motion.li key={task.id} className="popup-row is-done" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>
            <span className="popup-check" data-done aria-hidden>
              <Check size={11} />
            </span>
            <span className="popup-row-body">
              <strong>{task.text}</strong>
            </span>
          </motion.li>
        ))}
      </ul>

      <form
        className="popup-compose"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a quest…"
          aria-label="New quest"
          maxLength={140}
        />
        <button type="submit" aria-label="Add quest" disabled={!draft.trim()}>
          <Plus size={15} aria-hidden />
        </button>
      </form>

      <footer className="popup-foot">
        <span>
          <strong>{state.gold}</strong> gold
          <span aria-hidden> · </span>
          <strong>{done.length}</strong> cleared
        </span>
        <a className="popup-open" href="../" target="_blank" rel="noreferrer">
          Open full app
          <ExternalLink size={11} aria-hidden />
        </a>
      </footer>
    </div>
  );
}
