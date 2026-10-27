"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useStore, type SyncStatus } from "@/lib/store";
import { popVariants, softSpring } from "@/lib/motion";

const STATUS_COPY: Record<SyncStatus, string> = {
  off: "Local only",
  idle: "Local only",
  pending: "Syncing",
  error: "Queued",
  synced: "Synced",
};

const STATUS_TONE: Record<SyncStatus, string> = {
  off: "bg-faint",
  idle: "bg-faint",
  pending: "bg-warn",
  error: "bg-bad",
  synced: "bg-good",
};

function since(ts: number): string {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function clockOf(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * The cloud ledger. One glance says whether this device is talking to the
 * server, and the popover says exactly what is waiting, when the last write
 * landed and who it belongs to — plus a manual retry for a stuck queue.
 */
export default function SyncBadge() {
  const { sync, online, retrySync } = useStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onClick = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const label = !online ? "Offline" : STATUS_COPY[sync.status];

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="sync-badge"
        title={`Cloud sync — ${label}`}
      >
        <span
          className={`inline-block size-1.5 rounded-full ${online ? STATUS_TONE[sync.status] : "bg-warn"}`}
        />
        <span className="hidden min-xl:inline">{label}</span>
        {sync.queued && online && (
          <span className="sync-badge-flag" aria-hidden>
            1
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={popVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
            className="panel sync-ledger absolute top-[calc(100%+8px)] right-0 z-30 w-[268px] p-3"
            role="dialog"
            aria-label="Cloud sync ledger"
          >
            <p className="kicker">Cloud ledger</p>

            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  {online ? <Cloud size={12} aria-hidden /> : <CloudOff size={12} aria-hidden />}
                  {label}
                </dd>
              </div>
              <div>
                <dt>Last write</dt>
                <dd>{sync.lastSyncedAt ? `${clockOf(sync.lastSyncedAt)} · ${since(sync.lastSyncedAt)}` : "not yet"}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{sync.account?.email ?? "anonymous on this device"}</dd>
              </div>
              <div>
                <dt>Held offline</dt>
                <dd>
                  {sync.queued
                    ? `${sync.queued.tasks} quests · since ${clockOf(sync.queued.at)}`
                    : "nothing"}
                </dd>
              </div>
              {sync.lastError && (
                <div>
                  <dt>Last error</dt>
                  <dd title={sync.lastError}>{sync.lastError}</dd>
                </div>
              )}
              {sync.attempts > 0 && (
                <div>
                  <dt>Retries</dt>
                  <dd>{sync.attempts} failed</dd>
                </div>
              )}
            </dl>

            {sync.configured ? (
              <button
                type="button"
                onClick={() => {
                  retrySync();
                  setOpen(false);
                }}
                disabled={!online}
                className="sync-retry"
              >
                <RefreshCw size={12} aria-hidden />
                {online ? "Sync now" : "Waiting for a connection"}
              </button>
            ) : (
              <p className="sync-note">
                No Supabase keys on this deployment, so the ledger stays on this device only.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
