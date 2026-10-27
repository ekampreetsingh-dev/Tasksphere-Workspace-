"use client";

import { useCallback } from "react";
import { playSfx, primeSfx, type SfxName } from "./sfx";
import { useStore } from "./store";

/** Sound cues that follow the user's master switch and volume automatically. */
export function useSfx(): (name: SfxName) => void {
  const { state } = useStore();
  const enabled = state.soundEnabled;
  const volume = state.soundVolume;
  return useCallback(
    (name: SfxName) => {
      primeSfx();
      playSfx(name, enabled, volume);
    },
    [enabled, volume],
  );
}

export type { SfxName };
