"use client";

import { motion } from "motion/react";
import { meterTransition } from "@/lib/motion";

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  tone?: "accent" | "good" | "warn" | "bad" | "gold";
  height?: number;
  label?: string;
  reduced?: boolean;
}

const FILL: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  accent: "bg-[linear-gradient(90deg,var(--accent2),var(--accent))]",
  good: "bg-[linear-gradient(90deg,#56bd91,var(--green))]",
  warn: "bg-warn",
  bad: "bg-[linear-gradient(90deg,#ed6479,#f3946e)]",
  gold: "bg-gold",
};

export default function ProgressBar({
  value,
  tone = "accent",
  height = 6,
  label,
  reduced = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-bg"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={`h-full origin-left rounded-full ${FILL[tone]}`}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={meterTransition(reduced)}
        style={{ height: "100%" }}
      />
    </div>
  );
}
