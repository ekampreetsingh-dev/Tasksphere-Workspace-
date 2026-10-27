"use client";

import { motion } from "motion/react";
import { formatClock } from "@/lib/dates";
import type { TimerPhase } from "@/lib/useTimer";

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The focus dial. One tick per planned minute, an arc that only ever moves
 * forward, and a travelling head — so the remaining time reads from across the
 * room without needing to parse digits.
 */
export default function TimerRing({
  remaining,
  total,
  progress,
  phase,
  modeLabel,
  reduced,
}: {
  remaining: number;
  total: number;
  progress: number;
  phase: TimerPhase;
  modeLabel: string;
  reduced: boolean;
}) {
  const running = phase === "running";
  const plannedMinutes = Math.max(1, Math.round(total / 60));
  const shownMinutes = Math.min(60, plannedMinutes);

  return (
    <div className="dial-wrap">
      <motion.svg
        viewBox="0 0 200 200"
        className="dial"
        aria-hidden
        animate={reduced || !running ? { scale: 1 } : { scale: [1, 1.008, 1] }}
        transition={
          reduced || !running
            ? undefined
            : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <g className="dial-ticks">
          {Array.from({ length: shownMinutes }, (_, index) => {
            const angle = (index / shownMinutes) * 360;
            const major = index % 5 === 0;
            return (
              <line
                key={index}
                className={major ? "dial-tick dial-tick--major" : "dial-tick"}
                x1="100"
                y1={major ? 8 : 11}
                x2="100"
                y2="16"
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
        </g>

        <circle className="dial-track" cx="100" cy="100" r={RADIUS} />
        <circle
          className="dial-arc"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
          transform="rotate(-90 100 100)"
        />

        <g transform={`rotate(${progress * 360 - 90} 100 100)`}>
          <circle className="dial-head" cx={100 + RADIUS} cy="100" r="4.5" />
        </g>
      </motion.svg>

      <div className="dial-readout">
        <p className="kicker">{modeLabel}</p>
        <strong className="dial-clock">{formatClock(remaining)}</strong>
        <p className="dial-total">
          {phase === "done"
            ? "Complete"
            : phase === "paused"
              ? "On hold"
              : running
                ? "Running"
                : "Ready"}
          {" · "}
          {Math.round(total / 60)} min planned
        </p>
      </div>
    </div>
  );
}
