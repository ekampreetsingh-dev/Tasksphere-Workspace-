"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { Category, Priority, Status } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import ViewHeader from "../ViewHeader";
import Panel from "../ui/Panel";
import QuestLanes from "../QuestLanes";
import QuestComposer from "../QuestComposer";
import { revealVariants, softSpring } from "@/lib/motion";

const SORTS = [
  { id: "recent", label: "Newest" },
  { id: "priority", label: "Priority" },
  { id: "due", label: "Due date" },
] as const;

const PRIORITY_WEIGHT: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type SortId = (typeof SORTS)[number]["id"];

const PRIORITY_TONE: Record<Priority, string> = {
  urgent: "var(--red)",
  high: "var(--orange)",
  medium: "var(--blue)",
  low: "var(--green)",
};

export default function QuestsView({ reduced }: { reduced: boolean }) {
  const { state, setStatus, toggleTask, removeTask, addTask } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [sort, setSort] = useState<SortId>("recent");
  /* Open on a first run so capture is discoverable, closed afterwards so the
     board — not the form — owns the viewport. */
  const [composerOpen, setComposerOpen] = useState(() => state.tasks.length === 0);

  useEffect(() => {
    const open = () => setComposerOpen(true);
    window.addEventListener("tasksphere:capture", open);
    return () => window.removeEventListener("tasksphere:capture", open);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = state.tasks.filter((task) => {
      if (category !== "all" && task.category !== category) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      if (!needle) return true;
      return (
        task.text.toLowerCase().includes(needle) ||
        task.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });

    return list.sort((a, b) => {
      if (sort === "priority") {
        const delta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        return delta !== 0 ? delta : b.created - a.created;
      }
      if (sort === "due") {
        const left = a.due ?? "9999-99-99";
        const right = b.due ?? "9999-99-99";
        return left === right ? b.created - a.created : left < right ? -1 : 1;
      }
      return b.created - a.created;
    });
  }, [state.tasks, query, category, priority, sort]);

  const filtered = category !== "all" || priority !== "all" || query.trim() !== "";
  const open = visible.filter((task) => !task.completed).length;
  const cleared = visible.length - open;

  const reset = () => {
    setQuery("");
    setCategory("all");
    setPriority("all");
  };

  /* Deliberately silent: cues mark consequences — a quest captured, cleared,
     moved or deleted. Choosing a filter changes nothing, and clicking on every
     pill is how an app starts to sound like a slot machine. */

  return (
    <div className="view-board">
      <ViewHeader
        title="Quest board"
        subtitle={`${open} open · ${cleared} cleared${filtered ? " · filtered view" : ""}`}
        reduced={reduced}
        aside={
          <button
            type="button"
            onClick={() => {
              setComposerOpen((openState) => !openState);
              sfx("tap");
            }}
            aria-expanded={composerOpen}
            className="flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-[12.5px] font-bold text-[color:var(--on-accent)]"
          >
            {composerOpen ? <X size={13} aria-hidden /> : <Plus size={13} aria-hidden />}
            {composerOpen ? "Close capture" : "Add quest"}
          </button>
        }
      />

      <div className="toolbar" role="search">
        <label className="relative flex min-w-[190px] flex-1 items-center">
          <Search size={13} aria-hidden className="absolute left-3 text-faint" />
          <span className="sr-only">Search quests</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or #tag"
            className="h-9 w-full rounded-md border border-line bg-bg pl-8 pr-3 text-[12.5px] placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </label>

        <div className="pill-row" role="group" aria-label="Filter by category">
          <button
            type="button"
            className="pill"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="pill"
              aria-pressed={category === value}
              onClick={() => setCategory(value as Category)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pill-row" role="group" aria-label="Filter by priority">
          <button
            type="button"
            className="pill"
            aria-pressed={priority === "all"}
            onClick={() => setPriority("all")}
          >
            Any weight
          </button>
          {(["urgent", "high", "medium", "low"] as Priority[]).map((value) => (
            <button
              key={value}
              type="button"
              className="pill"
              aria-pressed={priority === value}
              onClick={() => setPriority(value)}
            >
              <i className="pill-dot" style={{ background: PRIORITY_TONE[value] }} aria-hidden />
              {value}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-line bg-surface-2 p-0.5">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSort(option.id)}
              aria-pressed={sort === option.id}
              className={`h-8 rounded px-2.5 text-[12px] transition-colors ${
                sort === option.id ? "bg-accent/15 font-bold text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filtered && (
          <button
            type="button"
            onClick={reset}
            className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-muted underline decoration-dotted transition-colors hover:text-ink"
          >
            <SlidersHorizontal size={12} aria-hidden />
            Clear
          </button>
        )}

        <span className="ml-auto font-meta text-[11.5px] text-faint tabular-nums">
          {visible.length} of {state.tasks.length}
        </span>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {composerOpen && (
          <motion.div
            key="composer"
            variants={revealVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
          >
            <Panel kicker="Capture" title="New quest" reduced={reduced} reveal={false}>
              <QuestComposer reduced={reduced} />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The columns stay on screen even when empty: they are the board, and a
          lane is a valid drop and capture target before it holds anything. */}
      {visible.length === 0 && (
        <p className="board-empty" role="status">
          {state.tasks.length === 0
            ? "No quests yet — capture one above. #tag, !high and @today are parsed for you."
            : "Nothing matches these filters."}
        </p>
      )}

      <QuestLanes
          tasks={visible}
          reduced={reduced}
          onStatusChange={(id, status, origin) => {
            /* Dropping into Cleared is a completion, so it has to pay like one.
               toggleTask() is the only path that awards XP, gold and boss damage. */
            const task = state.tasks.find((item) => item.id === id);
            if (status === "done" && task && !task.completed) {
              const gains = toggleTask(id, origin);
              if (gains) {
                sfx("check");
                push(`+${gains.xpGain} XP · +${gains.goldGain} gold`);
                return;
              }
            }
            setStatus(id, status);
            sfx(status === "done" ? "check" : "tap");
          }}
          onToggle={(id, origin) => {
            const gains = toggleTask(id, origin);
            if (gains) {
              sfx("check");
              push(`+${gains.xpGain} XP · +${gains.goldGain} gold`);
            }
          }}
          onAdd={() => {
            setComposerOpen(true);
            sfx("add");
            window.setTimeout(() => {
              document
                .querySelector<HTMLInputElement>('input[placeholder^="What needs doing"]')
                ?.focus();
            }, 280);
          }}
          onRemove={(id) => {
            const task = state.tasks.find((item) => item.id === id);
            removeTask(id);
            sfx("remove");
            if (task)
              push(`Deleted “${task.text.slice(0, 32)}”.`, "success", {
                label: "Undo",
                run: () =>
                  addTask({
                    text: task.text,
                    category: task.category,
                    priority: task.priority,
                    tags: task.tags,
                    due: task.due,
                  }),
              });
          }}
      />
    </div>
  );
}
