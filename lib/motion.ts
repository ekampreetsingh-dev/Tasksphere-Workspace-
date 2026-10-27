"use client";

import type { Transition, Variants } from "motion/react";

export const spring: Transition = { type: "spring", stiffness: 320, damping: 32, mass: 0.9 };
export const softSpring: Transition = { type: "spring", stiffness: 180, damping: 26 };

export const viewVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { ...spring, staggerChildren: 0.045, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: "easeIn" } },
};

export const riseVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

export const popVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  enter: { opacity: 1, scale: 1, transition: softSpring },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
};

/* Surfaces that live in the page flow settle into place; only overlays pop.
   Scaling a panel scales its text, which reads as a zoom, not an arrival. */
export const revealVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: softSpring },
  exit: { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

/**
 * Both bar charts in the app share one entrance rhythm, so a sparkline on Home
 * and the week columns on Progress grow in the same time.
 */
export const CHART_RHYTHM = { base: 0.06, step: 0.03, duration: 0.42 };
export function chartDelay(index: number): number {
  return CHART_RHYTHM.base + index * CHART_RHYTHM.step;
}

/**
 * Value meters — dragon HP, XP, bounty, energy — all move on the same spring,
 * so the same number animates identically wherever it appears. A spring rather
 * than a tween because these re-target: clearing a second quest mid-flight
 * should bend the fill, not restart it.
 */
export function meterTransition(reduced: boolean): Transition {
  return reduced ? { duration: 0 } : softSpring;
}

export const taskRowVariants: Variants = {
  initial: { opacity: 0, height: 0, y: -6 },
  enter: { opacity: 1, height: "auto", y: 0, transition: softSpring },
  exit: { opacity: 0, height: 0, y: 6, transition: { duration: 0.18 } },
};

export const tapFeedback = {
  whileTap: { scale: 0.97 },
  transition: spring,
};

/**
 * "Subtle" means short fades and no idle loops, so it switches off the JS
 * springs, travels and layout FLIP just like "reduced" does. The two differ on
 * the CSS side, where only "reduced" collapses every transition to zero.
 */
export function motionDisabled(preferred: "full" | "subtle" | "reduced"): boolean {
  if (preferred !== "full") return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const durations = { fast: 0.16, base: 0.26, slow: 0.42 };

/** The house curve — mirrors --ease-signature so JS and CSS agree. */
export const EASE_SIGNATURE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Seconds a payout spark spends travelling from the cleared card to the
 * campaign bar. The bar schedules its impact on the same number, so the
 * fill and the spark arrive together even though they are separate trees.
 */
export const XP_FLIGHT = 0.58;

/** Viewport centre of an element — the launch point for a payout spark. */
export function centerOf(el: Element): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
