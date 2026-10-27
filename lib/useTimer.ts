"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TIMER_SESSION_KEY } from "./storage";

export type TimerPhase = "idle" | "running" | "paused" | "done";

interface Session {
  endsAt: number;
  total: number;
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(TIMER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return Number.isFinite(parsed.endsAt) && parsed.endsAt > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  try {
    if (!session) sessionStorage.removeItem(TIMER_SESSION_KEY);
    else sessionStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

/**
 * Wall-clock driven, so a backgrounded tab catches up on return instead of
 * freezing at the last painted second — the behaviour the shipped build added.
 */
export function useFocusTimer(onComplete: (minutes: number) => void) {
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [total, setTotal] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const endsAt = useRef(0);
  const completedRef = useRef(onComplete);
  completedRef.current = onComplete;

  const tick = useCallback(() => {
    const left = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      setPhase("done");
      writeSession(null);
    }
  }, []);

  useEffect(() => {
    const restored = readSession();
    if (restored) {
      endsAt.current = restored.endsAt;
      setTotal(restored.total);
      setPhase("running");
      tick();
    }
  }, [tick]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(tick, 1000);
    const visible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [phase, tick]);

  useEffect(() => {
    if (phase !== "done") return;
    const minutes = Math.round(total / 60);
    completedRef.current(minutes);
    if (document.visibilityState === "hidden") {
      try {
        new Notification("Focus session complete", {
          body: `${minutes} minutes banked.`,
          tag: "tasksphere-focus",
        });
      } catch {
        /* notifications unsupported or not granted */
      }
    }
  }, [phase, total]);

  const start = useCallback(
    (minutes: number) => {
      const seconds = Math.max(60, Math.round(minutes * 60));
      const until = Date.now() + seconds * 1000;
      endsAt.current = until;
      setTotal(seconds);
      setRemaining(seconds);
      setPhase("running");
      writeSession({ endsAt: until, total: seconds });
    },
    [],
  );

  const pause = useCallback(() => {
    if (phase !== "running") return;
    setPhase("paused");
    writeSession(null);
  }, [phase]);

  const resume = useCallback(() => {
    if (phase !== "paused") return;
    endsAt.current = Date.now() + remaining * 1000;
    setPhase("running");
    writeSession({ endsAt: endsAt.current, total });
  }, [phase, remaining, total]);

  const reset = useCallback(() => {
    setPhase("idle");
    setRemaining(total);
    writeSession(null);
  }, [total]);

  /** Lengthen the live session without restarting the clock you already ran. */
  const extend = useCallback(
    (minutes: number) => {
      const seconds = Math.max(0, Math.round(minutes * 60));
      if (seconds === 0) return;
      setTotal((current) => current + seconds);
      if (phase === "running") {
        endsAt.current += seconds * 1000;
        writeSession({ endsAt: endsAt.current, total: total + seconds });
        tick();
      } else {
        setRemaining((current) => current + seconds);
      }
    },
    [phase, total, tick],
  );

  return {
    phase,
    total,
    remaining,
    progress: total > 0 ? 1 - remaining / total : 0,
    start,
    pause,
    resume,
    reset,
    extend,
  };
}
