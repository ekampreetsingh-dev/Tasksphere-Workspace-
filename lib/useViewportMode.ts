"use client";

import { useEffect, useMemo, useState } from "react";

export type Paradigm = "desktop" | "tablet" | "mobile" | "extension";

/**
 * The popover is a destination, never a guess. Width and height alone cannot
 * tell a 390x600 toolbar popup from a 390x844 phone whose soft keyboard is
 * open, and treating the latter as a popup swapped the whole workspace for a
 * 400px toolbar mid-sentence. Only an explicit ?mode=extension request or an
 * unpacked-extension origin gets the popover UI.
 */
export function extensionRequested(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.protocol === "chrome-extension:") return true;
    const params = new URLSearchParams(window.location.search);
    const flag = (params.get("mode") ?? params.get("view") ?? "").toLowerCase();
    return flag === "extension";
  } catch {
    return false;
  }
}

function detect(width: number): Paradigm {
  if (extensionRequested()) return "extension";
  if (width < 820) return "mobile";
  if (width < 1280) return "tablet";
  return "desktop";
}

export function readParadigm(): Paradigm {
  if (typeof window === "undefined") return "desktop";
  return detect(window.innerWidth);
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
    () => (size.w > 0 ? detect(size.w) : readParadigm()),
    [size.w],
  );

  return { paradigm };
}
