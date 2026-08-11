# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server, http://localhost:3000
npm run build          # production build
npm test               # vitest run (all tests)
npm run test:watch
npm run lint           # next lint  (lint:fix to autofix import sorting / unused imports)
npm run format         # prettier --write .
```

Single test file / single test:

```bash
npx vitest run src/lib/class-time.test.ts
npx vitest run -t "sorts AM slots"
```

Tests are colocated (`src/**/*.test.{ts,tsx}`), run in the `node` environment via
`vitest.config.ts`, and cover the pure helpers in `src/lib` — not pages or Supabase calls.
There is no TypeScript-only check script; use `npx tsc --noEmit`.

Do **not** run `npm run build` while a dev server is running — it overwrites the running
server's `.next` chunks.

## Working style (from `.cursor/rules/ponytail.mdc`, applies always)

Lazy senior dev: reuse the helper that already exists before writing a new one, prefer the
shortest working diff, no unrequested abstractions or dependencies. Fix bugs at the shared
function (grep its callers), not at the one call site the report names. Non-trivial logic
leaves one runnable check behind — a small `*.test.ts` next to the module. Mark deliberate
corner-cuts with a `ponytail:` comment naming the ceiling and the upgrade path.

## Architecture

Next.js 14 App Router + Supabase. Almost every page is a **client component querying
Supabase directly with the anon key** — there is no data-access layer and no server-side
data fetching for pages. RLS is therefore the only security boundary (see Invariants).

### Two apps in one tree

| | Teacher | Student |
|---|---|---|
| Login | `/admin` (reachable only by typing it) | `/login` (default entry for everything) |
| Routes | `/`, `/students`, `/class`, `/fees`, `/quran`, `/memorization`, `/media`, `/history`, `/notifications` | `/student/**` |
| Confinement | `src/middleware.ts` | same |

`src/components/app-shell.tsx` switches sidebar, top bar and ambient background on
`/student/**`, and wraps only the student side in `LiveClassProvider`. The palette is
selected by `<html data-portal="admin|student">`, stamped by an inline script in
`src/app/layout.tsx` before first paint (both palettes plus their `.dark` variants live in
`src/app/globals.css`). Fonts are self-hosted under `src/app/fonts/` — never add a Google
Fonts dependency.

### Auth layers (three, each doing a different job)

1. `src/middleware.ts` — session refresh, portal confinement, forced sign-out of
   `login_disabled` accounts. **API routes are exempt from every redirect**: a 307 drops
   the body of the `sendBeacon` to `/api/activity`.
2. `src/lib/api-auth.ts` — `requireTeacher()` is the single guard for `/api` routes;
   returns `{ user }` or a ready-to-return `denied` response. Never re-implement it inline
   (the old copy-pasted variants drifted and granted teacher powers by default).
3. `src/app/student/layout.tsx` — client-side `onAuthStateChange` catches a session dying
   while the tab is open, plus a 3h hard session timeout (`use-session-timeout.ts`).

`/api` routes use the **service-role** client (`src/lib/supabase-admin.ts`, bypasses RLS)
and derive `student_id` from the session cookie — the client never sends it.

### Live class (Supabase Realtime, no database involvement)

`src/lib/use-class-channel.ts` owns the whole protocol on topic `class:<studentId>`:
Presence answers "who's here / where", Broadcast carries `nav` (para + page), `scroll`
(a 0..1 ratio, not pixels — zoom levels differ; see `src/lib/scroll-sync.ts`) and `end`.

- **At most one instance per topic per client** — supabase-js reuses channels by topic. The
  student side keeps its single instance in `LiveClassProvider`; the teacher side in
  `live-session.tsx`. Don't add a second `useClassChannel` on either side.
- The `present` flag toggles track/untrack on the *same* channel, so a student can listen
  for "teacher is live" before joining without re-subscribing.
- When `NEXT_PUBLIC_REALTIME_PRIVATE=true`, `supabase.realtime.setAuth()` must run before
  `subscribe()` or the server denies the subscription silently.

A second, separate presence channel `students:online` (`src/lib/use-online-students.ts`)
powers the teacher's green online dot and carries the force-signout broadcast.

Page positions are persisted separately via `src/lib/para-progress.ts`
(`student_para_progress`, debounced read-modify-write, errors ignored).

### Qaida vs Quran

A Qaida class teaches `students.qaida_media_id` instead of one of the 30 paras. Both the
realtime channel and `student_para_progress` carry `QAIDA_NAV_PARA = 0` as the sentinel
(`src/lib/qaida.ts`); paras are 1–30 so it can't collide. Anything that renders "Para N",
computes progress, or constrains `para_number` in SQL must handle 0.

### Activity logging

`src/lib/activity-log.ts` buffers student page views and clicks, flushing on a size cap, a
4s timer, and on tab-hide via `navigator.sendBeacon` to `/api/activity`.

### Notifications

`src/lib/notify.ts` (server, service-role) produces them. Every producer fires from
something that can repeat (StrictMode double-mount, login redirect per tab, client retry),
so each suppresses an identical row inside the dedupe window — client-side guards are only
an optimisation.

## Invariants

Full detail lives in `README.md`; the ones that bite silently:

- **RLS is the security boundary.** A new table with no policy is readable by every student.
  Follow `supabase/migration_student_portal.sql`: teacher-full via `is_teacher()`,
  student-own via `my_student_id()`. `student_para_progress` once shipped with RLS on and
  zero policies — every read and write silently 403'd.
- **Roles live in two places.** `app_metadata.role` (JWT) wins, `profiles.role` is the
  fallback; neither present ⇒ **not** a teacher. Use `isTeacherRole`.
- **Student logins are usernames**, mapped to `<username>@$NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN`.
  Changing that env var breaks every existing login.
- **All times are PKT (UTC+5).** Class times are `"h:mm AM/PM"` strings — sort with
  `classTimeToMinutes`, never lexically.
- **Date-only columns are not timestamps.** `quran_rounds.started_at`/`completed_at` and the
  student date fields are `YYYY-MM-DD`; use `parseLocalDate`/`formatLocalDate` from
  `src/lib/utils.ts`. `class_sessions.started_at` *is* a timestamptz — plain `new Date()`
  is correct there.
- **Quran progress:** `completed = desc_completed + max(asc_completed - 1, 0)`; a finished
  round is `desc=30, asc=0`. The active round is the *latest* incomplete one.
- **PostgREST caps unfiltered selects at 1000 rows** — use `fetchAllRows`
  (`src/lib/supabase.ts`) for unbounded tables.

## Database

`supabase/*.sql` are hand-applied in the Supabase SQL editor, in the order listed in
`README.md` (not derivable from filenames). **The source of truth is the live database, not
the repo** — `student_para_progress` has no `CREATE TABLE` anywhere and `class_sessions` is
missing columns the app writes, so a database built from these files will not run the app.
See `BUGS.md`. When adding a column, write a migration file *and* apply it manually.

## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard,
/unfreeze, /gstack-upgrade, /learn