"use client";

import { useEffect, useMemo, useState } from "react";

export type Paradigm = "desktop" | "tablet" | "mobile" | "extension";

/**
 * Device paradigm, detected — never chosen. Width alone cannot tell a phone
 * from a toolbar popover (both are ~390px), so the short-and-narrow case is
 * the extension: a Chrome action popup is 380x580, a phone is 390x844.
 */
function detect(width: number, height: number): Paradigm {
  if (width <= 420 && height <= 640) return "extension";
  if (width < 820) return "mobile";
  if (width < 1280) return "tablet";
  return "desktop";
}

export function readParadigm(): Paradigm {
  if (typeof window === "undefined") return "desktop";
  return detect(window.innerWidth, window.innerHeight);
}

export function useViewportMode() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const paradigm = useMemo<Paradigm>(
    () => (size.w > 0 ? detect(size.w, size.h) : readParadigm()),
    [size.w, size.h],
  );

  return { paradigm };
}
