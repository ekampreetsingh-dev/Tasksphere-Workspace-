"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, GripVertical, ListChecks, Tag, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { dueDescription } from "@/lib/dates";
import { centerOf, taskRowVariants } from "@/lib/motion";
import type { Point } from "@/lib/store";
import RewardBurst from "./ui/RewardBurst";

/** Category is the one place a second hue earns its keep — as a dot, not a fill. */
const CATEGORY_DOT: Record<Task["category"], string> = {
  study: "var(--blue)",
  work: "var(--accent)",
  wellness: "var(--green)",
  life: "var(--orange)",
};

interface QuestCardProps {
  task: Task;
  reduced: boolean;
  onToggle: (id: string, origin?: Point) => void;
  onDragStart: (id: string) => void;
  onRemove: (id: string) => void;
}

function QuestCard({ task, reduced, onToggle, onDragStart, onRemove }: QuestCardProps) {
  const doneSubs = task.subtasks.filter((sub) => sub.done).length;
  const due = dueDescription(task.due);
  const nodeRef = useRef<HTMLLIElement>(null);
  const [burst, setBurst] = useState(false);

  /* A completed card re-mounts into the done lane, so the cue has to be keyed
     off the completion timestamp rather than a prop change. */
  useEffect(() => {
    if (reduced || !task.completed || task.completedAt === null) return;
    if (Date.now() - task.completedAt > 1500) return;
    setBurst(true);
    const id = window.setTimeout(() => setBurst(false), 660);
    return () => window.clearTimeout(id);
  }, [task.completed, task.completedAt, reduced]);

  /* Framer owns the onDragStart prop, so the native HTML5 drag hook is bound
     directly to the node instead. */
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const handle = (event: DragEvent) => {
      event.dataTransfer?.setData("text/plain", task.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      onDragStart(task.id);
    };
    node.addEventListener("dragstart", handle);
    return () => node.removeEventListener("dragstart", handle);
  }, [task.id, onDragStart]);

  return (
    <motion.li
      ref={nodeRef}
      layout={!reduced}
      variants={reduced ? undefined : taskRowVariants}
      initial={reduced ? false : "initial"}
      animate={reduced ? undefined : "enter"}
      exit={reduced ? undefined : "exit"}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      data-status={task.status}
      draggable
      className="quest-card group relative flex list-none gap-2.5 p-3"
    >
      <span
        className="mt-0.5 cursor-grab text-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical size={14} />
      </span>

      <label className="mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={(event) => {
            const card = event.currentTarget.closest("li");
            onToggle(task.id, centerOf(card ?? event.currentTarget));
          }}
          className="sr-only"
          aria-label={`Complete ${task.text}`}
        />
        <motion.span
          className="grid size-4 place-items-center rounded-[5px] border text-[10px]"
          animate={{
            backgroundColor: task.completed ? "var(--accent2)" : "transparent",
            borderColor: task.completed ? "var(--accent2)" : "var(--line-strong)",
            scale: task.completed ? 1.04 : 1,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          aria-hidden
        >
          {task.completed && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[9px] leading-none text-white"
            >
              ✓
            </motion.span>
          )}
        </motion.span>
      </label>

      <div className="quest-body">
        <p className="quest-title">{task.text}</p>

        {task.note && <p className="quest-note">{task.note}</p>}

        <div className="quest-meta">
          {due && (
            <span className="quest-chip">
              <CalendarDays size={10} aria-hidden />
              {due}
            </span>
          )}
          <span className={`quest-chip quest-priority`} data-priority={task.priority}>
            <i aria-hidden />
            {task.priority}
          </span>
          {task.subtasks.length > 0 && (
            <span className="quest-ring">
              <svg viewBox="0 0 20 20" aria-hidden>
                <circle className="quest-ring-bg" cx="10" cy="10" r="7.5" />
                <circle
                  className="quest-ring-fill"
                  cx="10"
                  cy="10"
                  r="7.5"
                  strokeDasharray={`${(doneSubs / task.subtasks.length) * 47.1} 47.1`}
                />
              </svg>
              <b>{Math.round((doneSubs / task.subtasks.length) * 100)}%</b>
            </span>
          )}
        </div>

        <div className="quest-foot">
          <span className="quest-cat">
            <i style={{ background: CATEGORY_DOT[task.category] }} aria-hidden />
            {CATEGORIES[task.category]}
          </span>
          <span className="quest-counts">
            {task.subtasks.length > 0 && (
              <span title={`${doneSubs} of ${task.subtasks.length} steps done`}>
                <ListChecks size={10} aria-hidden />
                {doneSubs}/{task.subtasks.length}
              </span>
            )}
            {task.tags.length > 0 && (
              <span title={task.tags.map((tag) => `#${tag}`).join(" ")}>
                <Tag size={10} aria-hidden />
                {task.tags.length}
              </span>
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(task.id)}
        className="quest-delete h-fit rounded-md p-1 text-faint opacity-0 transition hover:bg-surface-2 hover:text-bad focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Delete ${task.text}`}
      >
        <Trash2 size={13} />
      </button>

      <RewardBurst show={burst} tone="var(--accent2)" distance={30} />
    </motion.li>
  );
}

export default memo(QuestCard);
