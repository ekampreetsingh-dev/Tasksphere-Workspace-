"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  Globe,
  LogIn,
  LogOut,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Upload,
  User,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getSupabase } from "@/lib/supabase";
import { MODES } from "@/lib/constants";
import { blankState, normalizeAppState } from "@/lib/storage";
import { activityCsv, downloadText, questsCsv, stamp } from "@/lib/exporters";
import { popVariants, softSpring } from "@/lib/motion";
import type { Mode, MotionLevel } from "@/lib/types";

type Tab = "account" | "preferences" | "data";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "data", label: "Data" },
];

const MOTION_LEVELS: { id: MotionLevel; label: string; hint: string }[] = [
  { id: "full", label: "Full", hint: "Springs, layout FLIP and reveals." },
  { id: "subtle", label: "Subtle", hint: "Short fades, no idle loops." },
  { id: "reduced", label: "Reduced", hint: "Respects the OS setting." },
];

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, setPref, replaceState } = useStore();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    contentMax: "—",
    railW: "—",
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  const cloudReady = useMemo(() => {
    try {
      return getSupabase() !== null;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const styles = getComputedStyle(document.documentElement);
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        contentMax: styles.getPropertyValue("--content-max").trim() || "—",
        railW: styles.getPropertyValue("--rail-w").trim() || "—",
      });
    };
    measure();
    window.addEventListener("resize", measure);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") trapFocus(event, dialogRef.current);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const auth = async (action: "signIn" | "signUp") => {
    const supabase = getSupabase();
    if (!supabase) {
      push("Cloud is not configured for this deployment.", "error");
      return;
    }
    setBusy(true);
    try {
      const result =
        action === "signIn"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (result.error) {
        push(result.error.message, "error");
      } else if (result.data.user) {
        setUser({ id: result.data.user.id, email: result.data.user.email ?? undefined });
        push(action === "signIn" ? "Signed in — profile will merge." : "Check your inbox to confirm.");
      }
    } catch (error) {
      push(error instanceof Error ? error.message : "Auth failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "github" | "apple") => {
    const supabase = getSupabase();
    if (!supabase) {
      push("Cloud is not configured for this deployment.", "error");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    setBusy(false);
    if (error) push(error.message, "error");
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    push("Signed out. Local data stays on this device.");
  };

  const exportJson = () => {
    downloadText(
      `tasksphere-${stamp()}.json`,
      "application/json",
      JSON.stringify(state, null, 2),
    );
  };

  const exportLedger = () => {
    downloadText(`tasksphere-consistency-${stamp()}.csv`, "text/csv", activityCsv(state));
  };

  const exportQuests = () => {
    downloadText(`tasksphere-quests-${stamp()}.csv`, "text/csv", questsCsv(state));
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      replaceState(normalizeAppState(parsed, {}));
      push("Backup restored on this device.");
    } catch {
      push("That file is not a TaskSphere backup.", "error");
    }
  };

  const reset = () => {
    replaceState(blankState());
    push("Workspace reset. Cloud copy is untouched.", "error");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overscroll-contain bg-black/55 p-3.5 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <motion.div
            ref={dialogRef}
            variants={popVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
            onClick={(event) => event.stopPropagation()}
            tabIndex={-1}
            className="panel flex max-h-[min(86dvh,720px)] w-full max-w-[720px] flex-col overflow-hidden p-0"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold">
                <User size={15} aria-hidden className="text-accent" />
                Settings
              </h2>
              <nav className="flex items-center gap-1" aria-label="Settings sections">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={tab === item.id ? "true" : undefined}
                    className={`h-8 rounded-md px-2.5 text-[12px] transition-colors ${
                      tab === item.id
                        ? "bg-accent/12 font-bold text-accent"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={onClose}
                className="h-8 rounded-md border border-line px-2.5 text-[12px] text-muted hover:text-ink"
              >
                Close
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {tab === "account" && (
                <section className="space-y-4">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    Your workspace is stored locally first. Signing in mirrors it to a private
                    per-user row in Supabase, guarded by row-level security, so a second device
                    picks up where this one left off.
                  </p>

                  {!cloudReady ? (
                    <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-[12px] text-warn">
                      Cloud sync is off: this deployment has no Supabase publishable key
                      configured. Everything still works locally.
                    </p>
                  ) : user ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-good/40 bg-good/8 px-3 py-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-[13px]">
                          {user.email ?? "Signed in"}
                        </strong>
                        <small className="block font-meta text-[11px] text-muted">
                          id {user.id.slice(0, 8)}…
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-[12px] text-muted hover:text-ink"
                      >
                        <LogOut size={13} aria-hidden />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <form
                      className="space-y-2.5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void auth("signIn");
                      }}
                    >
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-[13px] focus:border-accent focus:outline-none"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-[13px] focus:border-accent focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          type="submit"
                          disabled={busy}
                          whileTap={busy ? undefined : { scale: 0.98 }}
                          transition={softSpring}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-[13px] font-bold text-[color:var(--on-accent)] disabled:opacity-60"
                        >
                          <LogIn size={14} aria-hidden />
                          Sign in
                        </motion.button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void auth("signUp")}
                          className="h-10 flex-1 rounded-md border border-line bg-surface-2 text-[13px] text-muted hover:text-ink disabled:opacity-60"
                        >
                          Create account
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex items-center gap-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-faint">
                    <span className="h-px flex-1 bg-line" />
                    or continue with
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["google", "Google"],
                        ["github", "GitHub"],
                        ["apple", "Apple"],
                      ] as const
                    ).map(([provider, label]) => (
                      <button
                        key={provider}
                        type="button"
                        disabled={busy || !cloudReady}
                        onClick={() => void oauth(provider)}
                        className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 text-[12px] text-muted hover:text-ink disabled:opacity-55"
                      >
                        <Globe size={13} aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-faint">
                    Only the publishable key ships with the app. A service-role key must never
                    appear in client code.
                  </p>
                </section>
              )}

              {tab === "preferences" && (
                <section className="space-y-5">
                  <Field label="Workspace theme" hint="Swaps every token, not just the accent.">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(Object.keys(MODES) as Mode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPref({ uiMode: mode })}
                          aria-pressed={state.uiMode === mode}
                          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left text-[12.5px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent/8 aria-pressed:text-ink"
                        >
                          <span
                            className="size-6 shrink-0 rounded-md border border-line"
                            style={{ background: SWATCH[mode] }}
                            aria-hidden
                          />
                          {MODES[mode]}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Motion" hint="Reduced drops every idle loop and reveal.">
                    <div className="flex flex-wrap gap-2">
                      {MOTION_LEVELS.map((level) => (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setPref({ motionLevel: level.id })}
                          aria-pressed={state.motionLevel === level.id}
                          title={level.hint}
                          className="h-9 rounded-md border border-line bg-surface-2 px-3 text-[12px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:font-bold aria-pressed:text-accent"
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {state.uiMode === "retro" && (
                    <Field label="CRT scanlines" hint="Retro mode only. Costs a little GPU.">
                      <button
                        type="button"
                        onClick={() => setPref({ crtEnabled: !state.crtEnabled })}
                        aria-pressed={state.crtEnabled}
                        className="h-9 rounded-md border border-line bg-surface-2 px-3 text-[12px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-accent"
                      >
                        {state.crtEnabled ? "On" : "Off"}
                      </button>
                    </Field>
                  )}

                  <Field label="Default session" hint="Used by the focus room and the palette.">
                    <div className="flex flex-wrap gap-1.5">
                      {[10, 15, 20, 25, 30, 45, 60].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setPref({ focusDefault: minutes })}
                          aria-pressed={state.focusDefault === minutes}
                          className="h-9 min-w-[52px] rounded-md border border-line bg-surface-2 px-2.5 text-[12px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-accent"
                        >
                          {minutes}m
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Sound volume">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={state.soundVolume}
                      onChange={(event) => setPref({ soundVolume: Number(event.target.value) })}
                      className="w-full accent-[var(--accent)]"
                    />
                  </Field>
                </section>
              )}

              {tab === "data" && (
                <section className="space-y-4">
                  <div className="rounded-lg border border-line bg-surface-2 p-3">
                    <p className="text-[12.5px] leading-relaxed text-muted">
                      Live readout of the layout ladder. The shell is always full-bleed; only the
                      content measure and the rail widen, so a 4K display gets a wider measure
                      rather than a stretched phone.
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-faint">
                      <span className="flex items-center gap-1.5">
                        {deviceIcon(viewport.width)}
                        <strong className="font-meta text-ink">
                          {viewport.width} × {viewport.height}
                        </strong>
                      </span>
                      <span className="font-meta">measure {viewport.contentMax}</span>
                      <span className="font-meta">rail {viewport.railW}</span>
                      <span className="font-meta">
                        {viewport.width < 768
                          ? "bottom bar"
                          : viewport.width < 1024
                            ? "stacked"
                            : "sidebar"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={exportJson}
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 text-[12.5px] text-muted hover:text-ink"
                    >
                      <Download size={13} aria-hidden />
                      Export backup
                    </button>
                    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface-2 text-[12.5px] text-muted hover:text-ink">
                      <Upload size={13} aria-hidden />
                      Import backup
                      <input
                        type="file"
                        accept="application/json"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void importJson(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={exportLedger}
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 text-[12.5px] text-muted hover:text-ink"
                    >
                      <Download size={13} aria-hidden />
                      Consistency CSV
                    </button>
                    <button
                      type="button"
                      onClick={exportQuests}
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 text-[12.5px] text-muted hover:text-ink"
                    >
                      <Download size={13} aria-hidden />
                      Quests CSV
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="h-10 w-full rounded-md border border-bad/40 bg-bad/10 text-[12.5px] font-bold text-bad"
                  >
                    Reset this device
                  </button>
                  <p className="text-[11px] leading-relaxed text-faint">
                    Reset clears local storage only. A signed-in cloud copy is left alone so you
                    can pull it back by signing in again.
                  </p>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-faint">{label}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function deviceIcon(width: number) {
  if (width < 500) return <Smartphone size={13} aria-hidden />;
  if (width < 900) return <Tablet size={13} aria-hidden />;
  if (width < 1500) return <Laptop size={13} aria-hidden />;
  return <Monitor size={13} aria-hidden />;
}

const SWATCH: Record<Mode, string> = {
  light: "linear-gradient(135deg,#ffffff,#8a6d1f)",
  cyber: "linear-gradient(135deg,#100e0c,#c9a962)",
  zen: "linear-gradient(135deg,#faf8f5,#4a6b53)",
  retro: "linear-gradient(135deg,#0d0221,#ff2a85 55%,#00f0ff)",
  brutalist: "linear-gradient(135deg,#fff 50%,#111 50%)",
};

function trapFocus(event: KeyboardEvent, container: HTMLElement | null): void {
  if (!container) return;
  const nodes = container.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
  );
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
