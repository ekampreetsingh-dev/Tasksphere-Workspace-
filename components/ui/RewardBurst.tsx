"use client";

import { AnimatePresence, motion } from "motion/react";

const ANGLES = [-95, -50, -12, 22, 60, 118, 160, 205];

/**
 * Eight sparks thrown outward from the centre of the nearest positioned
 * ancestor. Fired on completions and rewards — it is the visual half of the
 * completion cue, so it follows the same motion preference as the sound.
 */
export default function RewardBurst({
  show,
  tone = "var(--accent)",
  distance = 34,
}: {
  show: boolean;
  tone?: string;
  distance?: number;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="reward-burst"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          {ANGLES.map((angle, index) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <motion.i
                key={angle}
                style={{
                  "--tone": tone,
                  left: "50%",
                  top: "50%",
                  opacity: 0,
                } as React.CSSProperties}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                animate={{
                  x: Math.cos(rad) * distance,
                  y: Math.sin(rad) * distance,
                  scale: [0.4, 1.1, 0.2],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.55, delay: index * 0.012, ease: "easeOut" }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
