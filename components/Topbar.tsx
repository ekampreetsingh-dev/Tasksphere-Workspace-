"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coins, Command, Palette, PanelRight, Search, Settings2, Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { MODES } from "@/lib/constants";
import { VIEW_LABELS, type ViewId } from "@/lib/views";
import { popVariants, softSpring } from "@/lib/motion";
import type { Mode } from "@/lib/types";
import CampaignBar from "./CampaignBar";
import SyncBadge from "./SyncBadge";

export default function Topbar({
  view,
  reduced,
  assistHidden,
  onToggleAssist,
  onOpenPalette,
  onOpenSettings,
  onOpenShop,
}: {
  view: ViewId;
  reduced: boolean;
  assistHidden: boolean;
  onToggleAssist: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
}) {
  const { state, setPref } = useStore();
  const [modesOpen, setModesOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="breadcrumb flex min-w-0 items-center gap-2.5 text-[13px] text-muted">
          <span className="truncate">Workspace</span>
          <span aria-hidden className="text-[9px] text-faint">
            /
          </span>
          <strong className="truncate font-semibold text-ink">{VIEW_LABELS[view]}</strong>
          <SyncBadge />
        </div>

        <div className="flex items-center gap-2">
        {assistHidden && (
          <button
            type="button"
            onClick={onToggleAssist}
            className="assist-restore"
            title="Show counsel (Alt+A)"
            aria-label="Show counsel panel"
          >
            <PanelRight size={14} aria-hidden />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenShop}
          className="gold-chip"
          title="Reward store — spend gold (Alt+S)"
        >
          <Coins size={13} aria-hidden className="text-gold" />
          <strong>{state.gold}</strong>
          <span className="hidden min-lg:inline">gold</span>
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden h-8 min-w-[240px] items-center gap-2 rounded-md border border-line bg-bg px-2.5 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink md:flex"
        >
          <Search size={13} aria-hidden />
          <span>Search quests, ranks and actions</span>
          <kbd className="ml-auto font-meta text-[11px] text-faint">Ctrl K</kbd>
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          className="grid size-8 place-items-center rounded-md border border-line bg-surface text-muted md:hidden"
          aria-label="Open command palette"
        >
          <Command size={14} aria-hidden />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setModesOpen((open) => !open)}
            aria-expanded={modesOpen}
            className="flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Palette size={14} aria-hidden />
            <span className="hidden lg:inline">{MODES[state.uiMode as Mode]}</span>
          </button>

          <AnimatePresence>
            {modesOpen && (
              <motion.div
                variants={popVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                transition={softSpring}
                className="panel absolute top-[calc(100%+8px)] right-0 z-30 w-56 p-2"
                role="menu"
              >
                {(Object.keys(MODES) as Mode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPref({ uiMode: mode });
                      setModesOpen(false);
                    }}
                    data-active={mode === state.uiMode}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12.5px] text-muted hover:bg-surface-2 hover:text-ink data-[active=true]:text-ink data-[active=true]:bg-surface-2"
                  >
                    <span
                      className="size-3.5 shrink-0 rounded-full border border-line"
                      style={{ background: MODE_SWATCH[mode] }}
                    />
                    {MODES[mode]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => setPref({ soundEnabled: !state.soundEnabled })}
          aria-pressed={state.soundEnabled}
          className="grid size-8 place-items-center rounded-md border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
          aria-label={state.soundEnabled ? "Mute effects" : "Unmute effects"}
        >
          {state.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="grid size-8 place-items-center rounded-md border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
          aria-label="Open settings"
        >
          <Settings2 size={14} />
        </button>
        </div>
      </div>

      <CampaignBar reduced={reduced} />
    </header>
  );
}

const MODE_SWATCH: Record<Mode, string> = {
  light: "linear-gradient(135deg,#ffffff,#8a6d1f)",
  cyber: "linear-gradient(135deg,#100e0c,#c9a962)",
  zen: "linear-gradient(135deg,#f4f0e8,#3d6347)",
  retro: "linear-gradient(135deg,#0d0221,#ff2a85 55%,#00f0ff)",
  brutalist: "linear-gradient(135deg,#fff 50%,#111 50%)",
};
