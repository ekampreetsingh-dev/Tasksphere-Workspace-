"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { CloudOff, Plus } from "lucide-react";
import Rail from "./Rail";
import Topbar from "./Topbar";
import AssistRail from "./AssistRail";
import XpFlow from "./XpFlow";
import HomeView from "./views/HomeView";
import { useViewportMode } from "@/lib/useViewportMode";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { motionDisabled, viewVariants } from "@/lib/motion";
import { ASSIST_KEY, NAV_KEY, VIEW_KEY } from "@/lib/storage";
import { VIEW_LABELS, viewFromHash, viewFromShortcut, type ViewId } from "@/lib/views";
import { MODES } from "@/lib/constants";
import type { Mode } from "@/lib/types";

interface ViewProps {
  reduced: boolean;
  onGo: (view: ViewId) => void;
}

/* Home is the landing surface, so it stays in the entry chunk. Everything
   else — the board, the analytics, the dragon art and the two overlays — is
   fetched the first time it is asked for. */
const QuestsView = dynamic<ViewProps>(() => import("./views/QuestsView"), { ssr: false });
const ProgressView = dynamic<ViewProps>(() => import("./views/ProgressView"), { ssr: false });
const FocusView = dynamic<ViewProps>(() => import("./views/FocusView"), { ssr: false });
const LairView = dynamic<ViewProps>(() => import("./views/LairView"), { ssr: false });
const CommandPalette = dynamic<{
  open: boolean;
  onClose: () => void;
  onGo: (view: ViewId) => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  reduced: boolean;
}>(() => import("./CommandPalette"), { ssr: false });
const SettingsModal = dynamic<{ open: boolean; onClose: () => void }>(
  () => import("./SettingsModal"),
  { ssr: false },
);
const ShopSheet = dynamic<{ open: boolean; onClose: () => void }>(
  () => import("./ShopSheet"),
  { ssr: false },
);
const ShortcutSheet = dynamic<{ open: boolean; onClose: () => void }>(
  () => import("./ShortcutSheet"),
  { ssr: false },
);
const PopupApp = dynamic<Record<string, never>>(() => import("./PopupApp"), { ssr: false });

function readInitialView(): ViewId {
  if (typeof window === "undefined") return "home";
  const fromHash = viewFromHash(window.location.hash);
  if (fromHash) return fromHash;
  try {
    return viewFromHash(localStorage.getItem(VIEW_KEY)) ?? "home";
  } catch {
    return "home";
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_KEY) === "true";
  } catch {
    return false;
  }
}

const VIEWS_BY_ID: Record<ViewId, ComponentType<ViewProps>> = {
  home: HomeView,
  quests: QuestsView,
  progress: ProgressView,
  focus: FocusView,
  lair: LairView,
};

export default function Workspace() {
  const { state, ready, online, level, setPref } = useStore();
  const { paradigm } = useViewportMode();
  const { push } = useToast();
  const sfx = useSfx();
  const [view, setView] = useState<ViewId>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [assistHidden, setAssistHidden] = useState(false);
  const rankRef = useRef(level.level);
  const viewRef = useRef<ViewId>("home");

  /* One-shot client bootstrap: persisted view + rail state, before first paint settles. */
  useEffect(() => {
    setView(readInitialView());
    setCollapsed(readCollapsed());
    let hidden = false;
    try {
      hidden = localStorage.getItem(ASSIST_KEY) === "true";
    } catch {
      /* ignore */
    }
    setAssistHidden(hidden);
  }, []);

  const toggleAssist = useCallback(() => {
    setAssistHidden((current) => {
      const next = !current;
      try {
        localStorage.setItem(ASSIST_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    sfx("nav");
  }, [sfx]);

  /* Rank changes are global, so the fanfare lives with the shell, not a view. */
  useEffect(() => {
    const gained = level.level > rankRef.current;
    rankRef.current = level.level;
    if (!gained) return;
    sfx("levelUp");
    push(`Rank up — ${level.name}`, "success");
  }, [level.level, level.name, sfx, push]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /* The shell reads this attribute to pick a layout paradigm, so a forced
     choice survives a resize while a presenter talks. */
  useEffect(() => {
    document.documentElement.dataset.paradigm = paradigm;
  }, [paradigm]);

  const reduced = useMemo(() => motionDisabled(state.motionLevel), [state.motionLevel]);

  const go = useCallback(
    (next: ViewId) => {
      if (viewRef.current !== next) {
        viewRef.current = next;
        sfx("nav");
      }
      setView(next);
      try {
        localStorage.setItem(VIEW_KEY, next);
      } catch {
        /* ignore */
      }
      if (window.location.hash !== `#${next}`) {
        window.history.replaceState(null, "", `#${next}`);
      }
      document.getElementById("main")?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [sfx],
  );

  /* N is "write a quest", not "leave this page". Home already has the composer
     on screen, so it focuses that instead of teleporting the user to the board
     and losing their scroll position. */
  const openCapture = useCallback(() => {
    sfx("add");
    const onHome = viewRef.current === "home";
    if (!onHome) go("quests");
    window.dispatchEvent(new Event("tasksphere:capture"));
    /* The board's composer mounts behind an exit animation, so poll instead of
       guessing one delay — a fixed timeout focused nothing on a slow device. */
    const focusComposer = (tries: number) => {
      const box = document.querySelector<HTMLInputElement>('input[placeholder^="What needs doing"]');
      if (box) {
        box.focus();
        box.scrollIntoView({ block: "center" });
        return;
      }
      if (tries > 0) window.setTimeout(() => focusComposer(tries - 1), 120);
    };
    window.setTimeout(() => focusComposer(onHome ? 3 : 10), onHome ? 60 : 160);
  }, [go, sfx]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(NAV_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT");

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      /* `?` opens the shortcut sheet; the palette keeps its Ctrl/⌘+K home so
         the two overlays never compete for the same keystroke. */
      if (event.key === "?" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      /* Alt+1…5 and Alt+J are dead on Windows and Linux: Chrome claims
         Alt+number for tab switching and Alt+J for Downloads, at the browser
         level, so preventDefault() never sees them. Plain digits are the real
         shortcut; the Alt pairings stay for macOS and for muscle memory. */
      if (!typing && !event.altKey && !event.ctrlKey && !event.metaKey && /^[1-5]$/.test(event.key)) {
        const next = viewFromShortcut(event.key);
        if (next) {
          event.preventDefault();
          go(next);
          return;
        }
      }
      /* Plain letters are the only single-key bindings that reliably reach the
         page: Chrome takes Alt+number for tab switching and Alt+J for
         Downloads, and the Ctrl/Meta combinations for itself. */
      if (!typing && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "n") {
          event.preventDefault();
          openCapture();
          return;
        }
        if (key === "c") {
          event.preventDefault();
          setPaletteOpen(true);
          return;
        }
        if (key === "t") {
          event.preventDefault();
          const order = Object.keys(MODES);
          const at = order.indexOf(state.uiMode);
          setPref({ uiMode: order[(at + 1) % order.length] as Mode });
          sfx("nav");
          return;
        }
        if (key === "m") {
          event.preventDefault();
          setPref({ soundEnabled: !state.soundEnabled });
          sfx("tap");
          return;
        }
      }
      if (event.altKey && !typing) {
        const next = viewFromShortcut(event.key);
        if (next) {
          event.preventDefault();
          go(next);
          return;
        }
        if (event.key.toLowerCase() === "b") {
          event.preventDefault();
          toggleCollapse();
        }
        if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          setShopOpen(true);
        }
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          toggleAssist();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, openCapture, setPref, sfx, state.soundEnabled, state.uiMode, toggleCollapse, toggleAssist]);

  useEffect(() => {
    const onHash = () => {
      const next = viewFromHash(window.location.hash);
      if (next) setView(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const counts = useMemo(
    () => ({ quests: state.tasks.filter((task) => !task.completed).length }),
    [state.tasks],
  );

  const ActiveView = VIEWS_BY_ID[view];

  /* Narrow-and-short is a toolbar popover, so it gets its own surface rather
     than a squeezed dashboard. */
  if (ready && paradigm === "extension") {
    return <PopupApp />;
  }

  if (!ready) {
    return (
      <div className="shell" data-rail="open" aria-busy="true">
        <div className="rail" aria-hidden>
          <span className="sk sk-brand" />
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="sk sk-row" />
          ))}
        </div>
        <div className="page">
          <div className="topbar">
            <div className="topbar-row">
              <span className="sk sk-line" />
              <span className="sk sk-chip" />
            </div>
          </div>
          <div className="page-inner">
            <span className="sk sk-masthead" />
            <div className="tile-band tile-band--tertiary">
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className="sk sk-tile" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="shell"
      data-rail={collapsed ? "closed" : "open"}
      data-assist={assistHidden ? "hidden" : "open"}
    >
      <Rail
        view={view}
        onSelect={go}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        onOpenCapture={openCapture}
        onOpenSearch={() => setPaletteOpen(true)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        counts={counts}
      />

      <div className="page">
        <Topbar
          view={view}
          reduced={reduced}
          assistHidden={assistHidden}
          onToggleAssist={toggleAssist}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenShop={() => setShopOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <main id="main" className="page-inner" tabIndex={-1} aria-label={VIEW_LABELS[view]}>
          {!online && (
            <p className="offline-flag" role="status">
              <CloudOff size={13} aria-hidden />
              Offline — quests save on this device and sync the moment a connection returns.
            </p>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={viewVariants}
              initial={reduced ? undefined : "initial"}
              animate={reduced ? undefined : "enter"}
              exit={reduced ? undefined : "exit"}
            >
              <ActiveView reduced={reduced} onGo={go} />
            </motion.div>
          </AnimatePresence>

          <footer className="mt-8 border-t border-line pt-4 text-[11px] text-faint">
            <p>
              1…5 views · N new quest · C or Ctrl/⌘+K palette · ? shortcuts · T theme · M mute ·
              Alt+B rail · Alt+S store · Alt+A counsel
            </p>
          </footer>
        </main>
      </div>

      {!assistHidden && (
        <AssistRail
          reduced={reduced}
          onGo={go}
          onOpenShop={() => setShopOpen(true)}
          onCollapse={toggleAssist}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onGo={go}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        reduced={reduced}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ShopSheet open={shopOpen} onClose={() => setShopOpen(false)} />

      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <button type="button" className="mobile-fab" onClick={openCapture} aria-label="Add quest">
        <Plus size={22} aria-hidden />
      </button>

      <XpFlow reduced={reduced} />
    </div>
  );
}
