"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import type { Status, Task } from "@/lib/types";
import type { Point } from "@/lib/store";
import QuestCard from "./QuestCard";

const LANES: { status: Status; label: string; note: string; tone: string }[] = [
  { status: "todo", label: "Backlog", note: "Captured, not started", tone: "var(--blue)" },
  { status: "progress", label: "In flight", note: "Currently active", tone: "var(--orange)" },
  { status: "done", label: "Cleared", note: "Rewards banked", tone: "var(--green)" },
];

interface QuestLanesProps {
  tasks: Task[];
  reduced: boolean;
  onStatusChange: (id: string, status: Status, origin?: Point) => void;
  onToggle: (id: string, origin?: Point) => void;
  onRemove: (id: string) => void;
  onAdd: (status: Status) => void;
}

export default function QuestLanes({
  tasks,
  reduced,
  onStatusChange,
  onToggle,
  onRemove,
  onAdd,
}: QuestLanesProps) {
  const [hovered, setHovered] = useState<Status | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="lanes">
      {LANES.map((lane) => {
        const laneTasks =
          lane.status === "done"
            ? tasks.filter((task) => task.status === "done" || task.completed)
            : tasks.filter((task) => task.status === lane.status && !task.completed);
        const isTarget = hovered === lane.status && dragging !== null;

        return (
          <section
            key={lane.status}
            className="lane"
            aria-label={lane.label}
            data-drop={isTarget ? "true" : "false"}
            style={{ "--lane-tone": lane.tone } as React.CSSProperties}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (hovered !== lane.status) setHovered(lane.status);
            }}
            onDragLeave={() => setHovered((current) => (current === lane.status ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              setHovered(null);
              setDragging(null);
              if (id) onStatusChange(id, lane.status, { x: event.clientX, y: event.clientY });
            }}
          >
            <header className="lane-head">
              <h2 className="lane-title">
                <span className="lane-dot" aria-hidden />
                {lane.label}
                <span className="hidden text-[11px] font-medium text-faint sm:inline">
                  {lane.note}
                </span>
              </h2>
              <span className="lane-count">{laneTasks.length}</span>
              <button
                type="button"
                className="lane-add"
                onClick={() => onAdd(lane.status)}
                aria-label={`Add a quest to ${lane.label}`}
                title={`Add to ${lane.label.toLowerCase()}`}
              >
                <Plus size={13} aria-hidden />
              </button>
            </header>

            <motion.ul layout className="lane-body">
              <AnimatePresence initial={false} mode="popLayout">
                {laneTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    task={task}
                    reduced={reduced}
                    onToggle={onToggle}
                    onDragStart={setDragging}
                    onRemove={onRemove}
                  />
                ))}
              </AnimatePresence>

              {laneTasks.length === 0 && (
                <motion.li
                  layout
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="lane-empty"
                >
                  {isTarget ? "Drop to move here" : `No quests in ${lane.label.toLowerCase()}`}
                </motion.li>
              )}
            </motion.ul>
          </section>
        );
      })}
    </div>
  );
}
