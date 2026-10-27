"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame, Sparkles, Swords } from "lucide-react";
import { useStore, type XpPulse } from "@/lib/store";
import { BOSS_HP_MAX } from "@/lib/constants";
import { dayKey, shiftDate } from "@/lib/dates";
import { useSfx } from "@/lib/useSfx";
import { XP_FLIGHT, meterTransition } from "@/lib/motion";
import { useTween } from "@/lib/useTween";

/**
 * The campaign meridian: one strip that always answers "how is the war
 * going" — the dragon's remaining will, the last week of the streak, and the
 * rank ladder. It lives in the sticky header so progress is legible from
 * whichever tab you happen to be working in.
 */
export default function CampaignBar({ reduced }: { reduced: boolean }) {
  const { state, level, streak, pulse } = useStore();
  const sfx = useSfx();
  const [impact, setImpact] = useState<XpPulse | null>(null);
  const seen = useRef(0);

  const delay = reduced ? 0 : XP_FLIGHT;
  const hp = useTween(state.bossHp, !reduced, delay);
  const xp = useTween(state.xp, !reduced, delay);

  useEffect(() => {
    if (!pulse || pulse.id === seen.current) return;
    seen.current = pulse.id;
    const timer = window.setTimeout(() => setImpact(pulse), reduced ? 40 : XP_FLIGHT * 1000);
    return () => window.clearTimeout(timer);
  }, [pulse, reduced]);

  useEffect(() => {
    if (!impact) return;
    sfx("hit");
    const timer = window.setTimeout(() => setImpact(null), 900);
    return () => window.clearTimeout(timer);
  }, [impact, sfx]);

  const week = useMemo(() => {
    const days: { key: string; on: boolean }[] = [];
    for (let back = 6; back >= 0; back--) {
      const date = shiftDate(new Date(), -back);
      const key = dayKey(date);
      days.push({
        key,
        on: (state.activity[key] ?? 0) > 0 || state.shieldedDays.includes(key),
      });
    }
    return days;
  }, [state.activity, state.shieldedDays]);

  const bossFrac = Math.max(0, Math.min(1, state.bossHp / BOSS_HP_MAX));
  const slain = state.bossHp <= 0;

  return (
    <div className="meridian" role="group" aria-label="Campaign status">
      <span className="sr-only">
        Dragon at {state.bossHp} of {BOSS_HP_MAX} hit points, streak {streak} days, {level.name}{" "}
        with {level.toNext} experience to next rank.
      </span>

      <div
        className="meridian-cell"
        title={
          slain
            ? "Dragon slain — it reforms next Monday"
            : `${state.bossHp} hit points left this week · every completed quest wounds it by its XP value`
        }
      >
        <Flame size={13} aria-hidden className="meridian-icon" data-slain={slain || undefined} />
        <span className="meridian-label">Dragon</span>
        <span className="meridian-track">
          <motion.span
            className="meridian-fill"
            data-kind="ember"
            initial={false}
            animate={{ scaleX: bossFrac }}
            transition={meterTransition(reduced)}
          />
          {impact && (
            <motion.span
              key={`boss-hit-${impact.id}`}
              className="meridian-flash"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </span>
        <span className="meridian-value">
          <b>{Math.round(hp)}</b>
          <i>/{BOSS_HP_MAX}</i>
        </span>
      </div>

      <span className="meridian-rule" aria-hidden />

      <div className="meridian-cell" title={`${streak}-day streak · the seven bars are the last week`}>
        <Sparkles size={13} aria-hidden className="meridian-icon" />
        <span className="meridian-label">Streak</span>
        <span className="meridian-pips">
          {week.map((day) => (
            <motion.span
              key={day.key}
              className="meridian-pip"
              data-on={day.on || undefined}
              initial={false}
              animate={
                day.on && !reduced
                  ? { opacity: [0.35, 1], scale: [0.82, 1] }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ))}
        </span>
        <span className="meridian-value">
          <b>{streak}</b>
          <i>d</i>
        </span>
      </div>

      <span className="meridian-rule" aria-hidden />

      <div
        className="meridian-cell meridian-cell-rank"
        data-meridian="xp"
        title={
          level.nextName
            ? `${level.toNext} XP to ${level.nextName}`
            : "Highest rank reached — the ledger keeps counting anyway"
        }
      >
        <Swords size={13} aria-hidden className="meridian-icon" />
        <span className="meridian-label">{level.name}</span>
        <span className="meridian-track">
          <motion.span
            className="meridian-fill"
            data-kind="brass"
            initial={false}
            animate={{ scaleX: level.progress }}
            transition={meterTransition(reduced)}
          />
          {impact && (
            <motion.span
              key={`rank-hit-${impact.id}`}
              className="meridian-flash"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </span>
        <span className="meridian-value">
          <b>{Math.round(xp)}</b>
          <i>XP</i>
        </span>
        <AnimatePresence>
          {impact && (
            <motion.span
              key={`numeral-${impact.id}`}
              className="meridian-numeral"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: -2 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
            >
              +{impact.xp} XP
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
