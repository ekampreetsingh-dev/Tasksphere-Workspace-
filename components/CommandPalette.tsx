"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Coins,
  CornerDownLeft,
  Palette,
  Search,
  Settings2,
  Timer,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { MODES } from "@/lib/constants";
import { VIEW_LABELS, VIEW_SUBTITLES, VIEWS, type ViewId } from "@/lib/views";
import { popVariants, softSpring } from "@/lib/motion";
import type { Mode } from "@/lib/types";

interface Command {
  id: string;
  label: string;
  detail: string;
  group: "Navigate" | "Quests" | "Appearance" | "Actions";
  Icon: LucideIcon;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onGo,
  onOpenSettings,
  onOpenShop,
  reduced,
}: {
  open: boolean;
  onClose: () => void;
  onGo: (view: ViewId) => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  reduced: boolean;
}) {
  const { state, level, setPref, toggleTask } = useStore();
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const navigate: Command[] = VIEWS.map((view) => ({
      id: `view-${view}`,
      label: VIEW_LABELS[view],
      detail: VIEW_SUBTITLES[view],
      group: "Navigate",
      Icon: ArrowRight,
      run: () => {
        onGo(view);
        onClose();
      },
    }));

    const appearance: Command[] = (Object.keys(MODES) as Mode[]).map((mode) => ({
      id: `mode-${mode}`,
      label: mode === state.uiMode ? `Theme: ${MODES[mode]}` : `Switch to ${MODES[mode]}`,
      detail: `Rank ${mode === "cyber" ? 1 : 2}+ · applies instantly`,
      group: "Appearance",
      Icon: mode === state.uiMode ? Check : Palette,
      run: () => {
        setPref({ uiMode: mode });
        push(`${MODES[mode]} applied.`);
        onClose();
      },
    }));

    const open = state.tasks
      .filter((task) => !task.completed)
      .slice(0, 12)
      .map<Command>((task) => ({
        id: `task-${task.id}`,
        label: task.text,
        detail: `${task.priority} · ${task.status}`,
        group: "Quests",
        Icon: Check,
        run: () => {
          const gains = toggleTask(task.id);
          if (gains) push(`+${gains.xpGain} XP · +${gains.goldGain} gold`);
          onClose();
        },
      }));

    const actions: Command[] = [
      {
        id: "act-settings",
        label: "Open settings",
        detail: "Account, preferences and data",
        group: "Actions",
        Icon: Settings2,
        run: () => {
          onOpenSettings();
          onClose();
        },
      },
      {
        id: "act-focus",
        label: `Start a ${state.focusDefault} minute session`,
        detail: "Jump to the focus room",
        group: "Actions",
        Icon: Timer,
        run: () => {
          onGo("focus");
          onClose();
        },
      },
      {
        id: "act-shop",
        label: "Open reward store",
        detail: `${state.gold} gold to spend`,
        group: "Actions",
        Icon: Coins,
        run: () => {
          onOpenShop();
          onClose();
        },
      },
      {
        id: "act-cleared",
        label: "Clear completed quests",
        detail: `${state.tasks.filter((task) => task.completed).length} archived`,
        group: "Actions",
        Icon: Trash2,
        run: () => {
          const cleared = state.tasks.filter((task) => !task.completed);
          setPref({ tasks: cleared });
          push(`Removed ${state.tasks.length - cleared.length} completed quests.`);
          onClose();
        },
      },
    ];

    return [...navigate, ...open, ...appearance, ...actions];
  }, [state, onGo, onOpenSettings, onOpenShop, onClose, push, setPref, toggleTask, level.level]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands.slice(0, 14);
    return commands
      .filter(
        (command) =>
          command.label.toLowerCase().includes(needle) ||
          command.detail.toLowerCase().includes(needle) ||
          command.group.toLowerCase().includes(needle),
      )
      .slice(0, 14);
  }, [commands, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((index) => (index + 1) % Math.max(1, results.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((index) => (index - 1 + results.length) % Math.max(1, results.length));
      } else if (event.key === "Enter") {
        event.preventDefault();
        results[cursor]?.run();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, cursor, onClose]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center overflow-y-auto overscroll-contain bg-black/55 p-3.5 pt-[8vh] backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            variants={popVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
            onClick={(event) => event.stopPropagation()}
            className="panel w-full max-w-[600px] overflow-hidden p-0"
          >
            <label className="flex items-center gap-2.5 border-b border-line px-3.5">
              <Search size={14} aria-hidden className="text-faint" />
              <span className="sr-only">Search commands and quests</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to a view, finish a quest, switch theme…"
                className="h-12 w-full bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
              />
              <kbd className="shrink-0 font-meta text-[10.5px] text-faint">Esc</kbd>
            </label>

            <ul ref={listRef} className="max-h-[min(52vh,420px)] overflow-y-auto p-1.5">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-[12.5px] text-muted">
                  Nothing matches “{query}”.
                </li>
              )}
              {results.map((command, index) => (
                <li key={command.id}>
                  {index > 0 && results[index - 1].group !== command.group && (
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-faint">
                      {command.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setCursor(index)}
                    onClick={command.run}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      index === cursor ? "bg-accent/12 text-ink" : "text-muted hover:bg-surface-2"
                    }`}
                  >
                    <command.Icon
                      size={13}
                      aria-hidden
                      className={index === cursor ? "shrink-0 text-accent" : "shrink-0"}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] font-semibold">
                        {command.label}
                      </strong>
                      <small className="block truncate text-[11px] text-faint">{command.detail}</small>
                    </span>
                    {index === cursor && (
                      <CornerDownLeft size={12} aria-hidden className="shrink-0 text-faint" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <footer className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[10.5px] text-faint">
              <span>{results.length} results</span>
              <span className="font-meta">↑↓ move · ⏎ run · rank {level.level}</span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
