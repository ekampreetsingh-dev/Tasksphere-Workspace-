"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import type { Category, Priority } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { spring, tapFeedback } from "@/lib/motion";
import { dayKey } from "@/lib/dates";

const PRIORITY_TOKEN: Record<string, Priority> = {
  "!low": "low",
  "!med": "medium",
  "!high": "high",
  "!urgent": "urgent",
};

/** Inline shorthand kept from the shipped builder: #tag, !priority, @date. */
export function parseQuickText(raw: string): {
  text: string;
  tags: string[];
  priority?: Priority;
  due?: string;
} {
  const tags: string[] = [];
  let priority: Priority | undefined;
  let due: string | undefined;

  const text = raw
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((kept, token) => {
      const lower = token.toLowerCase();
      if (lower.startsWith("#") && lower.length > 1) tags.push(token.slice(1));
      else if (PRIORITY_TOKEN[lower]) priority = PRIORITY_TOKEN[lower];
      else if (lower.startsWith("@") && /^\d{4}-\d{2}-\d{2}$/.test(token.slice(1)))
        due = token.slice(1);
      else if (lower === "@today") due = dayKey();
      else kept.push(token);
      return kept;
    }, [])
    .join(" ");

  return { text, tags, priority, due };
}

export default function QuestComposer({ reduced }: { reduced: boolean }) {
  const { addTask } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("life");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [openDetails, setOpenDetails] = useState(false);

  const submit = () => {
    const parsed = parseQuickText(text);
    if (!parsed.text.trim()) return;
    const task = addTask({
      text: parsed.text,
      category,
      priority: parsed.priority ?? priority,
      tags: parsed.tags,
      due: parsed.due ?? (due || null),
      note,
    });
    if (task) {
      setText("");
      setNote("");
      setOpenDetails(false);
      sfx("add");
      push(`Quest added to the board.`);
    }
  };

  return (
    <form
      className="space-y-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="quest-text">
        New quest
      </label>
      <input
        id="quest-text"
        className="h-11 w-full rounded-lg border border-line bg-bg px-3.5 text-[13px] transition-colors placeholder:text-faint focus:border-accent focus:outline-none"
        placeholder="What needs doing?  #tag  !high  @today"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={140}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setOpenDetails((open) => !open);
            sfx("tap");
          }}
          aria-expanded={openDetails}
          className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <ChevronDown
            size={12}
            aria-hidden
            style={{ transform: openDetails ? "rotate(180deg)" : undefined, transition: "transform .2s" }}
          />
          Details
        </button>

        <select
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-muted"
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
          aria-label="Category"
        >
          {Object.entries(CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-muted"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          aria-label="Priority"
        >
          {(["low", "medium", "high", "urgent"] as Priority[]).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-muted [color-scheme:light_dark]"
          value={due}
          onChange={(event) => setDue(event.target.value)}
          aria-label="Due date"
        />
      </div>

      {openDetails && (
        <label className="block">
          <span className="sr-only">Details</span>
          <textarea
            id="quest-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why it matters, or the first step. Shows under the title on the card."
            className="w-full resize-y rounded-lg border border-line bg-bg p-3 text-[12.5px] leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none"
            maxLength={280}
          />
        </label>
      )}

      <motion.button
        type="submit"
        {...(reduced ? {} : tapFeedback)}
        transition={spring}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-[13px] font-bold text-white"
      >
        <Plus size={15} aria-hidden />
        Add quest
      </motion.button>

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Sparkles size={11} aria-hidden className="text-accent" />
        Shorthand is parsed on submit.
      </p>
    </form>
  );
}
