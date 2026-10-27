"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/dates";

export default function StreakShield({ reduced }: { reduced: boolean }) {
  const { state, streak } = useStore();
  const protectedToday =
    state.shieldedDays.includes(dayKey()) || Boolean(state.streakShield);

  return (
    <div className="panel flex items-center gap-3 bg-[linear-gradient(100deg,var(--panel),var(--panel-2))]">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          state.streakShield ? "bg-info/12 text-info" : "bg-surface-2 text-faint"
        }`}
        aria-hidden
      >
        {state.streakShield ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-[13px]">
          {state.streakShield ? "Streak shield armed" : "Shield spent"}
        </strong>
        <span className="block text-[11.5px] text-muted">
          {state.streakShield
            ? "Miss one day and the streak survives."
            : `Recover it in the shop for 45 gold. Currently ${streak} days.`}
        </span>
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-good">
        {protectedToday ? "Today covered" : `${streak}d`}
      </span>
    </div>
  );
}
