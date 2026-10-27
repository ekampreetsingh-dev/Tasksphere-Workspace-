"use client";

import { motion } from "motion/react";
import { Crown } from "lucide-react";
import Panel from "../ui/Panel";
import ProgressBar from "../ui/ProgressBar";
import { useStore } from "@/lib/store";
import { EASE_SIGNATURE } from "@/lib/motion";
import { RANKS } from "@/lib/constants";

export default function RankPanel({ reduced }: { reduced: boolean }) {
  const { state, level } = useStore();
  const pct = Math.round(level.progress * 100);
  const nextRankIndex = RANKS.findIndex((rank) => rank.level === level.level + 1);

  return (
    <Panel
      kicker="Experience"
      title="Experience & level"
      icon={<Crown size={15} />}
      actions={
        <span className="font-meta text-[12px] text-accent tabular-nums">{state.xp} XP</span>
      }
      reduced={reduced}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <strong className="font-display text-[17px] tracking-tight">{level.name}</strong>
        <span className="text-[11.5px] text-muted">rank {level.level} of {RANKS.length}</span>
      </div>

      <motion.div
        className="mb-3 flex items-end justify-between text-[11px] text-muted"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_SIGNATURE }}
      >
        <span>Progress to next rank</span>
        <span className="font-meta tabular-nums">{pct}%</span>
      </motion.div>

      <ProgressBar value={pct} label="Progress to next rank" reduced={reduced} height={7} />

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {level.toNext > 0 && nextRankIndex > -1 ? (
          <>
            <strong className="text-ink">{level.toNext} XP</strong> to{" "}
            {RANKS[nextRankIndex].name}. Each cleared quest pays 10-30 XP by priority; a finished
            focus session pays a flat 50.
          </>
        ) : (
          <>Highest rank reached. The dragon still needs you.</>
        )}
      </p>
    </Panel>
  );
}
