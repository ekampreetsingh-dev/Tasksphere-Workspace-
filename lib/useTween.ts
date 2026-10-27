"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/**
 * Eases a number toward its target so gamification totals read as a ledger
 * being written rather than a value being swapped. Interrupting mid-flight
 * resumes from wherever the previous tween stopped, so rapid completions
 * stack instead of snapping.
 */
export function useTween(target: number, enabled: boolean, delay = 0): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (!enabled) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const controls = animate(shownRef.current, target, {
      duration: 0.55,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        shownRef.current = value;
        setShown(value);
      },
      onComplete: () => {
        shownRef.current = target;
      },
    });
    return () => controls.stop();
  }, [target, enabled, delay]);

  return shown;
}
