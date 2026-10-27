"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useStore, type Point } from "@/lib/store";
import { XP_FLIGHT } from "@/lib/motion";

interface Shot {
  id: number;
  from: Point;
  apex: Point;
  to: Point;
}

/**
 * Carries the payout from the exact spot you clicked up into the campaign
 * meridian. Rendered through a portal because the header applies a
 * backdrop-filter, which would become the containing block for a fixed child
 * and pin the spark to the wrong coordinates.
 */
export default function XpFlow({ reduced }: { reduced: boolean }) {
  const { pulse } = useStore();
  const [shot, setShot] = useState<Shot | null>(null);
  const [mounted, setMounted] = useState(false);
  const fired = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced || !pulse || pulse.id === fired.current || !pulse.origin) return;
    if (pulse.origin.x === 0 && pulse.origin.y === 0) return;
    const target = document.querySelector('[data-meridian="xp"]');
    if (!target) return;
    fired.current = pulse.id;
    const rect = target.getBoundingClientRect();
    const from = pulse.origin;
    const to = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setShot({
      id: pulse.id,
      from,
      to,
      apex: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 96 },
    });
  }, [pulse, reduced]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {shot && (
        <motion.span
          key={shot.id}
          className="xp-spark"
          initial={{ x: shot.from.x, y: shot.from.y, scale: 0.4, opacity: 0 }}
          animate={{
            x: [shot.from.x, shot.apex.x, shot.to.x],
            y: [shot.from.y, shot.apex.y, shot.to.y],
            scale: [0.4, 1.15, 0.3],
            opacity: [0, 1, 0.9],
          }}
          exit={{ opacity: 0, scale: 0.2 }}
          transition={{
            duration: XP_FLIGHT,
            times: [0, 0.52, 1],
            ease: ["easeOut", "easeIn"],
          }}
          onAnimationComplete={() => setShot(null)}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
