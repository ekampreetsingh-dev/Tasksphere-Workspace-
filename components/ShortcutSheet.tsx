"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Keyboard } from "lucide-react";
import { popVariants, softSpring } from "@/lib/motion";

interface Row {
  keys: string[];
  what: string;
}

interface Group {
  title: string;
  rows: Row[];
}

/* One list, ordered by how often a hand leaves the mouse — not by feature area.
   Anything not on this sheet does not exist, so it stays deliberately short. */
const GROUPS: Group[] = [
  {
    title: "Everywhere",
    rows: [
      { keys: ["1", "…", "5"], what: "Jump to a view" },
      { keys: ["N"], what: "New quest — focuses the composer" },
      { keys: ["Ctrl", "K"], what: "Command palette" },
      { keys: ["?"], what: "This sheet" },
      { keys: ["T"], what: "Cycle theme" },
      { keys: ["M"], what: "Mute sound" },
      { keys: ["Esc"], what: "Close whatever is open" },
    ],
  },
  {
    title: "Focus room",
    rows: [
      { keys: ["Space"], what: "Start · pause · resume the timer" },
      { keys: ["["], what: "Five minutes shorter" },
      { keys: ["]"], what: "Five minutes longer" },
    ],
  },
  {
    title: "Layout",
    rows: [
      { keys: ["Alt", "B"], what: "Collapse or open the rail" },
      { keys: ["Alt", "A"], what: "Show or hide counsel" },
      { keys: ["Alt", "S"], what: "Reward store" },
      { keys: ["Alt", "1", "…", "5"], what: "Views, for muscle memory" },
    ],
  },
];

export default function ShortcutSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      /* `?` is toggled by the shell so the two listeners cannot fight over it. */
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overscroll-contain bg-black/55 p-3.5 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <motion.div
            ref={dialogRef}
            variants={popVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
            onClick={(event) => event.stopPropagation()}
            tabIndex={-1}
            className="panel max-h-[min(86dvh,720px)] w-full max-w-[560px] overflow-y-auto overscroll-contain p-0"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold">
                <Keyboard size={15} aria-hidden className="text-accent" />
                Keyboard shortcuts
              </h2>
              <kbd className="font-meta text-[10.5px] text-faint">Esc</kbd>
            </header>

            <div className="grid gap-5 p-4">
              {GROUPS.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-faint">
                    {group.title}
                  </h3>
                  <ul className="grid gap-0.5">
                    {group.rows.map((row) => (
                      <li
                        key={row.what}
                        className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5"
                      >
                        <span className="min-w-0 text-[12.5px] text-muted">{row.what}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {row.keys.map((key, index) =>
                            key === "…" ? (
                              <span key={index} className="text-[10px] text-faint">
                                …
                              </span>
                            ) : (
                              <kbd
                                key={index}
                                className="min-w-[22px] rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 text-center font-meta text-[10.5px] text-ink"
                              >
                                {key}
                              </kbd>
                            ),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <footer className="border-t border-line px-4 py-2.5 text-[11px] text-faint">
              Shortcuts stay off while you are typing in a field.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
