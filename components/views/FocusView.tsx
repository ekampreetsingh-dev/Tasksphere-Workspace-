"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BookOpen,
  Brain,
  CloudRain,
  Dumbbell,
  Expand,
  Eye,
  Feather,
  ListChecks,
  Minimize,
  Minus,
  Music,
  Palette,
  Pause,
  PenLine,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Sparkle,
  Timer,
  Volume2,
  Waves,
  Wind,
} from "lucide-react";
import ViewHeader from "../ViewHeader";
import Panel from "../ui/Panel";
import TimerRing from "../TimerRing";
import { useStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { useFocusTimer } from "@/lib/useTimer";
import { centerOf, revealVariants, softSpring } from "@/lib/motion";
import { setAmbient, stopAmbient, type AmbientKind } from "@/lib/ambient";
import { focusStats } from "@/lib/metrics";

const MODES = [
  { id: "focus", label: "Deep focus", minutes: 25, accent: "var(--accent)", Icon: Brain },
  { id: "study", label: "Study session", minutes: 25, accent: "var(--blue)", Icon: BookOpen },
  { id: "reading", label: "Reading", minutes: 30, accent: "var(--blue)", Icon: Palette },
  { id: "exercise", label: "Exercise / move", minutes: 20, accent: "var(--green)", Icon: Dumbbell },
  { id: "sports", label: "Athletics practice", minutes: 45, accent: "var(--green)", Icon: Sparkle },
  { id: "creative", label: "Creative work", minutes: 45, accent: "#d0a6ff", Icon: Feather },
  { id: "writing", label: "Writing sprint", minutes: 45, accent: "#d0a6ff", Icon: PenLine },
  { id: "mindfulness", label: "Mindfulness reset", minutes: 10, accent: "#74d8e7", Icon: Wind },
  { id: "chores", label: "Life admin / chores", minutes: 20, accent: "var(--orange)", Icon: Timer },
] as const;

type ModeId = (typeof MODES)[number]["id"];

const LENGTHS = [15, 25, 50, 90];

const AMBIENT: { id: AmbientKind; label: string; Icon: typeof Waves }[] = [
  { id: "off", label: "Silence", Icon: Radio },
  { id: "white", label: "White noise", Icon: Waves },
  { id: "rain", label: "Rain", Icon: CloudRain },
  { id: "lofi", label: "Lo-fi", Icon: Music },
];

export default function FocusView({ reduced }: { reduced: boolean }) {
  const { state, setPref, claimFocusSession, toggleTask } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const [mode, setMode] = useState<ModeId>((state.activityMode as ModeId) || "focus");
  const [minutes, setMinutes] = useState(() => {
    const found = MODES.find((item) => item.id === state.activityMode);
    return found?.minutes ?? state.focusDefault ?? 25;
  });
  const [immersive, setImmersive] = useState(false);
  const chimeAt = useRef(0);
  const awayAt = useRef(0);

  const timer = useFocusTimer((banked) => {
    claimFocusSession(banked);
    sfx("finish");
    push(`${banked} minute session banked · +50 XP · +10 gold`);
  });

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const focus = focusStats(state);
  const linked = useMemo(
    () => state.tasks.filter((task) => !task.completed).slice(0, 6),
    [state.tasks],
  );

  const locked = timer.phase === "running" || timer.phase === "paused";
  const endsLabel =
    timer.phase === "done"
      ? "—"
      : new Date(Date.now() + timer.remaining * 1000).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

  const primary =
    timer.phase === "running"
      ? { label: "Hold the session", Icon: Pause, run: () => { timer.pause(); sfx("pause"); } }
      : timer.phase === "paused"
        ? { label: "Back to it", Icon: Play, run: () => { timer.resume(); sfx("start"); } }
        : {
            label: timer.phase === "done" ? "Run it again" : `Begin ${minutes} minutes`,
            Icon: Play,
            run: () => {
              timer.start(minutes);
              sfx("start");
            },
          };

  const setLength = (next: number) => {
    const clamped = Math.min(180, Math.max(5, next));
    setMinutes(clamped);
    setPref({ focusDefault: clamped });
    sfx("tap");
  };

  /* The bed is a side effect on a live audio graph, not renderable state. */
  useEffect(() => {
    setAmbient(state.ambientSound as AmbientKind, state.soundEnabled ? state.soundVolume : 0);
    return () => stopAmbient();
  }, [state.ambientSound, state.soundVolume, state.soundEnabled]);

  /* Minute chime + tab-away cue, both opt-in exactly as in the shipped build.
     This effect re-runs every second the timer ticks, so the away bell needs
     its own latch — without it the app clicked once per second the whole time
     you were on another tab. */
  useEffect(() => {
    if (timer.phase !== "running") {
      chimeAt.current = 0;
      awayAt.current = 0;
      return;
    }
    const remainingMinutes = Math.ceil(timer.remaining / 60);
    if (state.minuteChime && remainingMinutes !== chimeAt.current) {
      chimeAt.current = remainingMinutes;
      if (remainingMinutes > 0 && timer.remaining % 60 < 2) sfx("chime");
    }
    if (document.visibilityState === "hidden") {
      if (state.awayChime && awayAt.current === 0) {
        awayAt.current = timer.remaining;
        sfx("chime");
      }
    } else {
      awayAt.current = 0;
    }
  }, [timer.phase, timer.remaining, state.minuteChime, state.awayChime, sfx]);

  /* Space starts, holds and resumes — the one control worth a keystroke. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== "Space" || !target) return;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.tagName === "SELECT" ||
        /* a focused button already activates on Space — don't fire twice */
        target.closest("button") !== null;
      if (typing) return;
      event.preventDefault();
      primary.run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary]);

  return (
    <div
      className="view-focus"
      data-stage={immersive ? "solo" : "full"}
      style={{ "--mode-accent": activeMode.accent } as React.CSSProperties}
    >
      <ViewHeader
        className="span-all"
        title={immersive ? "Distraction-free" : "Focus mode"}
        subtitle={`${focus.today} minutes banked today · ${focus.thisWeek} this week · ${focus.allTime} all-time`}
        reduced={reduced}
        aside={
          <button
            type="button"
            onClick={() => {
              setImmersive((on) => !on);
              sfx("nav");
            }}
            aria-pressed={immersive}
            className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink data-[aria-pressed=true]:border-accent data-[aria-pressed=true]:text-accent"
          >
            {immersive ? <Minimize size={13} aria-hidden /> : <Expand size={13} aria-hidden />}
            {immersive ? "Leave distraction-free" : "Distraction-free"}
          </button>
        }
      />

      {!immersive && (
        <Panel kicker="Modes" title="Session type" reduced={reduced} reveal={false} bodyClass="mt-1">
          <div className="mode-list" role="group" aria-label="Session type">
            {MODES.map((item) => {
              const selected = item.id === mode;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="mode-row"
                  aria-pressed={selected}
                  onClick={() => {
                    setMode(item.id);
                    setMinutes(item.minutes);
                    setPref({ activityMode: item.id, focusDefault: item.minutes });
                    sfx("tap");
                  }}
                >
                  <item.Icon size={14} aria-hidden style={{ color: item.accent }} />
                  {item.label}
                  <span>{item.minutes}m</span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <section className="stage" aria-label="Timer">
        <TimerRing
          remaining={timer.remaining}
          total={timer.total}
          progress={timer.progress}
          phase={timer.phase}
          modeLabel={activeMode.label}
          reduced={reduced}
        />

        <div className="stage-controls">
          <motion.button
            type="button"
            className="stage-primary"
            onClick={primary.run}
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            transition={softSpring}
          >
            <primary.Icon size={15} aria-hidden />
            {primary.label}
            <kbd className="stage-kbd">Space</kbd>
          </motion.button>

          <button
            type="button"
            className="stage-icon"
            onClick={() => {
              timer.extend(5);
              sfx("tap");
            }}
            disabled={timer.phase === "idle"}
            title="Add five minutes to the running clock"
            aria-label="Add five minutes"
          >
            <Plus size={15} aria-hidden />
          </button>

          <button
            type="button"
            className="stage-icon"
            onClick={() => {
              timer.reset();
              sfx("remove");
            }}
            title="Reset the dial"
            aria-label="Reset timer"
          >
            <RotateCcw size={15} aria-hidden />
          </button>
        </div>

        <div className="stage-foot">
          <span className="stepper">
            <button
              type="button"
              onClick={() => setLength(minutes - 5)}
              disabled={locked || minutes <= 10}
              aria-label="Five minutes shorter"
            >
              <Minus size={13} aria-hidden />
            </button>
            <strong>{minutes} min</strong>
            <button
              type="button"
              onClick={() => setLength(minutes + 5)}
              disabled={locked || minutes >= 175}
              aria-label="Five minutes longer"
            >
              <Plus size={13} aria-hidden />
            </button>
          </span>

          <span className="seg" role="group" aria-label="Common lengths">
            {LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => setLength(length)}
                aria-pressed={minutes === length}
                disabled={locked}
              >
                {length}
              </button>
            ))}
          </span>

          <span className="stage-foot-meta">
            <span>
              <em>Ends</em>
              <b>{endsLabel}</b>
            </span>
            <span>
              <em>Reward</em>
              <b>+50 XP · 10g</b>
            </span>
            <span>
              <em>Today</em>
              <b>{focus.today} min</b>
            </span>
          </span>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {immersive ? (
          <motion.div
            key="notes"
            variants={revealVariants}
            initial={reduced ? false : "initial"}
            animate="enter"
            exit={reduced ? undefined : "exit"}
            className="stack"
          >
            <Panel kicker="Locked in" title="Session notes" reduced={reduced} reveal={false}>
              <textarea
                rows={14}
                placeholder="Anything that pops up mid-session goes here so it can wait until the dial closes."
                className="w-full resize-y rounded-lg border border-line bg-bg p-3 text-[13px] leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </Panel>
          </motion.div>
        ) : (
          <motion.div
            key="side"
            className="stack"
            variants={revealVariants}
            initial={reduced ? false : "initial"}
            animate="enter"
            exit={reduced ? undefined : "exit"}
          >
            <Panel
              kicker="Anchor"
              title="Linked quests"
              icon={<ListChecks size={15} />}
              reduced={reduced}
              reveal={false}
            >
              {linked.length === 0 ? (
                <p className="text-[12.5px] text-muted">
                  Nothing open to link. Capture a quest on the board first.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {linked.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={(event) => {
                          const gains = toggleTask(task.id, centerOf(event.currentTarget));
                          if (gains) {
                            sfx("check");
                            push(`+${gains.xpGain} XP · +${gains.goldGain} gold`);
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-left text-[12.5px] transition-colors hover:border-accent"
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{task.text}</span>
                        <span className="shrink-0 font-meta text-[10.5px] text-faint">
                          {task.priority}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel kicker="Atmosphere" title="Bed and cues" reduced={reduced} reveal={false}>
              <div className="flex flex-wrap gap-2">
                {AMBIENT.map(({ id, label, Icon }) => {
                  const selected = state.ambientSound === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setPref({ ambientSound: id });
                        sfx("tap");
                      }}
                      aria-pressed={selected}
                      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors ${
                        selected
                          ? "border-accent bg-accent/12 font-bold text-accent"
                          : "border-line bg-surface-2 text-muted hover:text-ink"
                      }`}
                    >
                      <Icon size={13} aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block text-[11px] text-muted">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={state.soundVolume}
                  onChange={(event) => setPref({ soundVolume: Number(event.target.value) })}
                  className="mt-1.5 w-full accent-[var(--accent)]"
                />
              </label>

              <div className="mt-3 grid gap-2">
                <Toggle
                  on={state.minuteChime}
                  icon={<Bell size={13} />}
                  label="Minute chime"
                  hint="Soft tick as each minute falls away."
                  onToggle={() => setPref({ minuteChime: !state.minuteChime })}
                />
                <Toggle
                  on={state.awayChime}
                  icon={<Eye size={13} />}
                  label="Tab-away cue"
                  hint="Chime when you leave the tab mid-session."
                  onToggle={() => setPref({ awayChime: !state.awayChime })}
                />
                <Toggle
                  on={state.soundEnabled}
                  icon={<Volume2 size={13} />}
                  label="Effect sounds"
                  hint="Master switch for every cue in the app."
                  onToggle={() => setPref({ soundEnabled: !state.soundEnabled })}
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Rain and lo-fi are synthesised in the browser, so the bed keeps working offline. The
                dial runs on the wall clock — a backgrounded tab catches up on return.
              </p>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({
  on,
  icon,
  label,
  hint,
  onToggle,
}: {
  on: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-line-strong aria-pressed:border-accent"
    >
      <span className={on ? "text-accent" : "text-faint"} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[12.5px]">{label}</strong>
        <small className="block text-[11px] text-muted">{hint}</small>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}
        aria-hidden
      >
        <motion.span
          layout
          transition={softSpring}
          className="absolute top-0.5 size-4 rounded-full bg-white"
          style={{ left: on ? "18px" : "2px" }}
        />
      </span>
    </button>
  );
}

