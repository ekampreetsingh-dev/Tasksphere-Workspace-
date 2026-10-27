# TaskSphere 3.0 — Next.js rewrite

React port of the single-file `../index.html` app: Next.js 15 App Router, TypeScript strict,
Tailwind CSS v4 and `motion` (Framer Motion). Built to fix the two shipped problems — the
animation layer and the laptop/desktop layout.

## Run it

```bash
cp .env.example .env.local   # optional, only needed for cloud sync
npm install
npm run dev                  # http://localhost:3000
```

Verification before deploying:

```bash
npm run typecheck
npm run build
```

## Layout approach

Breakpoints are width-based **and** height-based, driven by custom properties rather than
per-component viewport tests. Everything lives in `app/globals.css`:

| token          | what it controls                              |
| -------------- | --------------------------------------------- |
| `--rail-w`     | sidebar width (full rail → icon rail)         |
| `--content-max`| max measure for the page body                 |
| `--page-pad`   | outer padding                                 |
| `--stack-gap`  | gap between panel rows                        |
| `--text-scale` | type ramp, so 13px cards don't shrink at 4K   |
| `--card-min-h` | kanban/panel minimum heights                  |

Steps: `1280px`, `1440px`, `1800px`, `2200px`, plus `max-height: 580px`. That height step used
to fire at 700px, which a 125%-scaled 1080p laptop reports — so a perfectly normal screen lost
its rail furniture and card proportions. Only genuinely short windows pay it now.

The three multi-column views (Home, Focus, Lair) do **not** read the viewport: `.page` is a
named container (`container-type: inline-size; container-name: page`) and they split at
`@container page` widths of 860px / 820px / 780px, because the rail and counsel can eat 500px
of a 1440px window. The rail collapse is a user choice persisted to
`tasksphere.navCollapsed` — never a viewport side effect.

The extension popover is a destination, not a guess: only `?mode=extension` (or a
`chrome-extension://` origin) renders it. Width alone cannot tell a 390×600 toolbar popup from
a 390×844 phone with the keyboard open.

## Structure

```
app/            layout.tsx (theme bootstrap, metadata, PWA manifest), page.tsx, globals.css
components/     Workspace shell, Rail, Topbar, QuestComposer, KanbanBoard, CommandPalette, SettingsModal
components/views    Home / Quests / Progress / Focus / Sanctuary
components/panels   Rank, Heatmap, WeekMomentum, Boss, Bounty, StreakShield, Upcoming, Companion
components/ui       Panel, StatCard, ProgressBar
lib/            store.tsx (reducer + XP/gold/streak rules), storage.ts, supabase.ts,
                dates.ts, constants.ts, motion.ts, ambient.ts, useTimer.ts, views.ts, types.ts
public/         manifest.webmanifest, sw.js, icon.svg, icon-maskable.svg
```

## Supabase sync

Same table as the shipped app (`public.tasksphere_app_profiles`, one jsonb blob per user,
per-user RLS). Reads merge tasks by id and take the max of numeric counters instead of
last-write-wins. Writes are debounced at 600ms with a 1.2s floor and one request in flight;
`pagehide`, `beforeunload` and a hidden tab flush immediately. A push never starts while a pull
is in flight, and signing in pulls and merges before the first push.

Cross-device arrival is ~1s: `supabase.sql` adds the table to the `supabase_realtime`
publication, so the shell subscribes to `postgres_changes` filtered by `user_id`, with `focus`
and `visibilitychange` pulls as the fallback where a socket is not available.

Only the public anon/publishable key is used. **Never put a service-role key in this
project** — everything here ships to the browser.

Without `.env.local` values the app runs local-first from `localStorage`; sync stays off.

## Deploy on Vercel

1. Import the repo as a **second** project, Root Directory = `tasksphere-web`.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy to a preview URL first and check 1280, 1366×768, 1440×900 and 1920×1080.
4. Promote to production only when the preview matches the mobile/tablet quality.

The original project keeps serving `index.html` untouched until that cutover.
