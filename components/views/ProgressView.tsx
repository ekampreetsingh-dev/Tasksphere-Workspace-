"use client";

import { useMemo } from "react";
import { Award } from "lucide-react";
import ViewHeader from "../ViewHeader";
import Panel from "../ui/Panel";
import RankPanel from "../panels/RankPanel";
import Heatmap from "../panels/Heatmap";
import WeekPanel from "../panels/WeekPanel";
import BountyPanel from "../panels/BountyPanel";
import UpcomingList from "../panels/UpcomingList";
import StreakShield from "../panels/StreakShield";
import { useStore } from "@/lib/store";
import { weekKey } from "@/lib/dates";
import { BOSS_HP_MAX } from "@/lib/constants";
import { completionStats, longestRun, velocityStats } from "@/lib/metrics";

export default function ProgressView({ reduced }: { reduced: boolean }) {
  const { state, level } = useStore();

  const numbers = useMemo(() => {
    const cleared = completionStats(state);
    const velocity = velocityStats(state);
    const bestDay = Object.entries(state.activity).reduce(
      (best, [day, count]) => (count > best.count ? { day, count } : best),
      { day: "—", count: 0 },
    );
    return {
      cleared,
      velocity,
      bestDay,
      longest: longestRun(state),
      damage: BOSS_HP_MAX - Math.max(0, Math.min(BOSS_HP_MAX, state.bossHp)),
    };
  }, [state]);

  return (
    <div className="view-report">
      <ViewHeader
        className="span-all"
        title="Progress"
        subtitle={`${weekKey()} · rank ${level.level} of 12 · ${numbers.cleared.allTime} quests cleared all-time`}
        reduced={reduced}
        aside={
          <span className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[11.5px] text-muted">
            <Award size={13} aria-hidden className="text-accent" />
            {level.name}
          </span>
        }
      />

      <div className="report-main">
        <WeekPanel reduced={reduced} />
        <Heatmap reduced={reduced} />

        <Panel kicker="Records" title="Personal bests" reduced={reduced}>
          <dl className="records">
            <div>
              <dt>Cleared all-time</dt>
              <dd>{numbers.cleared.allTime}</dd>
            </div>
            <div>
              <dt>Best day</dt>
              <dd>
                {numbers.bestDay.count
                  ? `${numbers.bestDay.count} · ${numbers.bestDay.day}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Longest run</dt>
              <dd>{numbers.longest} days</dd>
            </div>
            <div>
              <dt>7-day velocity</dt>
              <dd>{numbers.velocity.perDay}/day</dd>
            </div>
            <div>
              <dt>Dragon damage</dt>
              <dd>
                {numbers.damage} / {BOSS_HP_MAX}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <aside className="report-side">
        <UpcomingList reduced={reduced} />
        <BountyPanel reduced={reduced} />
        <RankPanel reduced={reduced} />
        <StreakShield reduced={reduced} />
      </aside>
    </div>
  );
}
