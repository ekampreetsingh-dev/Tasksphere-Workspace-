"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { animate, motion, useInView } from "motion/react";
import { EASE_SIGNATURE, CHART_RHYTHM, chartDelay, riseVariants, spring } from "@/lib/motion";

type TileTone = "accent" | "good" | "warn" | "info" | "bad" | "gold";

interface TileProps {
  label: string;
  value: number;
  unit?: string;
  foot?: ReactNode;
  tone?: TileTone;
  icon?: ReactNode;
  /** Trailing values for the micro bar chart; last entry is treated as today. */
  spark?: number[];
  reduced?: boolean;
}

/**
 * Home's metric primitive. A hairline tone stripe replaces the old glowing
 * card, so a band of six tiles reads as one instrument panel.
 */
export default function Tile({
  label,
  value,
  unit,
  foot,
  tone = "accent",
  icon,
  spark,
  reduced = false,
}: TileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const shown = useRef(0);

  useEffect(() => {
    const node = ref.current?.querySelector<HTMLElement>("[data-value]");
    if (!node) return;
    if (reduced || !inView) {
      node.textContent = String(value);
      shown.current = value;
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest));
      },
    });
    shown.current = value;
    return () => controls.stop();
  }, [value, inView, reduced]);

  const peak = spark && spark.length > 1 ? Math.max(...spark, 1) : 1;

  return (
    <motion.div
      ref={ref}
      data-tone={tone}
      className="tile"
      variants={riseVariants}
      initial={reduced ? undefined : "initial"}
      animate={reduced ? undefined : "enter"}
      whileHover={reduced ? undefined : { y: -3, transition: spring }}
    >
      <div className="tile-head">
        <span className="tile-label">{label}</span>
        {icon && (
          <span className="tile-icon" aria-hidden>
            {icon}
          </span>
        )}
      </div>

      <p className="tile-value">
        <span data-value>{reduced ? value : 0}</span>
        {unit && <span className="tile-unit">{unit}</span>}
      </p>

      {spark && spark.length > 1 && (
        <div className="tile-spark" aria-hidden>
          {spark.map((point, index) => (
            <motion.i
              key={index}
              data-today={index === spark.length - 1 ? "true" : undefined}
              initial={reduced ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              style={{
                height: `${Math.max(8, (point / peak) * 100)}%`,
                transformOrigin: "bottom",
              }}
              transition={{ duration: CHART_RHYTHM.duration, delay: chartDelay(index), ease: EASE_SIGNATURE }}
            />
          ))}
        </div>
      )}

      {foot && <p className="tile-foot">{foot}</p>}
    </motion.div>
  );
}
