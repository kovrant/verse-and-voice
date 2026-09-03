# Quran Academy

Next.js 14 + Supabase app for running a Quran academy: a teacher dashboard (students,
Quran/memorization progress, fees, live class sessions) and a separate read-mostly
student portal.

This README covers setup and the things the code can't tell you. For what the app
does, read `src/app/` — the routes are the feature list. For history, read `git log`.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev                        # http://localhost:3000
```

Node 20 (see `engines` in `package.json`).

### Environment variables

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key; all browser queries use it and are gated by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Creates/resets student logins. Never expose to the client |
| `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` | See "Student logins" below. **Changing this breaks every existing student login** |
| `NEXT_PUBLIC_REALTIME_PRIVATE` | `"true"` only after `migration_realtime_class_auth.sql` is applied, or live-class channels get denied |

## Database

Apply `supabase/*.sql` in this order (it is not derivable from the filenames):

```
schema.sql
migration_quran_progress.sql
migration_memorization.sql
setup_storage.sql
migration_media_library.sql
migration_quran_rounds.sql
migration_auth_rls.sql
migration_class_sessions.sql
migration_student_portal.sql        # must come after migration_auth_rls.sql
migration_realtime_class_auth.sql
migration_para_progress_rls.sql
migration_activity_logs.sql
migration_islamic_history.sql
migration_notifications.sql
migration_class_days.sql
migration_memorization_chunks.sql
migration_notifications_retention.sql
migration_notifications_rls_fix.sql
migration_qaida.sql
migration_qaida_live_class.sql     # allows para_number = 0 (the Qaida sentinel)
migration_namaz_steps.sql          # badges / student_badges (Namaz + achievement stubs)
migration_achievements.sql         # seed Qaida, para, half-Quran, khatm badges
migration_achievements_module.sql # unified achievements + certificates; drops badges tables
migration_memorization_revision.sql # revision bucket: revision_assigned_at + trigger fix
```

`backfill_old_fees_paid.sql` and `backfill_notification_copy.sql` are one-off data
fixes, not schema.

`migration_student_portal.sql` ends with a commented-out block that promotes the
teacher account. Run it once, with the real email substituted.

> **These files do not fully reproduce the live database.** `student_para_progress`
> has RLS policies but no `CREATE TABLE` anywhere, and `class_sessions` is missing
> the `ending_page` / `last_page` columns the app writes. A database built from
> these files will not run the app. See `BUGS.md`.

## Invariants

Break one of these and something fails quietly.

**All times are Pakistan Standard Time (UTC+5).** Class times are stored as
`"h:mm AM/PM"` strings; sort them with `classTimeToMinutes` (`src/lib/class-time.ts`),
never lexically.

**Date-only columns are not timestamps.** `quran_rounds.started_at` / `completed_at`
and the student date fields are `YYYY-MM-DD`. `new Date("2026-01-15")` parses as UTC
midnight and renders as the previous day west of UTC. Use `parseLocalDate` /
`formatLocalDate` from `src/lib/utils.ts`. `class_sessions.started_at` *is* a real
timestamptz, so plain `new Date()` is correct there.

**Two apps, two logins.** `/login` is the student login and the default entry point
for everything; `/admin` is the teacher login and is only reachable by typing it.
`src/middleware.ts` confines students to `/student/**` and keeps teachers out of it.
API routes are deliberately exempt from every redirect — a 307 would drop the request
body of a `sendBeacon` to `/api/activity`.

**Roles live in two places.** `app_metadata.role` on the JWT (cheap, no DB round-trip)
wins; `profiles.role` is the fallback for accounts predating the mirroring. An account
with *neither* is not a teacher — see `isTeacherRole` in `src/lib/student-auth.ts`.
Defaulting the missing case to "teacher" previously handed admin powers to any
authenticated account.

**Student logins are usernames, not emails.** Supabase Auth is email-based, so a
username is mapped deterministically to `<username>@$NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN`.
The domain is never sent anywhere; it just has to stay stable forever.

**RLS is the only security boundary.** Nearly every page is a client component
querying Supabase directly with the anon key. **A new table with no policy is readable
by every student.** Follow the pattern in `migration_student_portal.sql`: teacher-full
via `is_teacher()`, student-own via `my_student_id()`. This has already been missed
twice (`student_para_progress` shipped with RLS enabled and zero policies, so every
read and write silently 403'd).

**Quran progress formula.** Rounds track paras from two directions:
`desc_completed` counts down from 30, `asc_completed` is the para currently being read.

```
completed = desc_completed + max(asc_completed - 1, 0)
```

A finished round is `desc=30, asc=0`. Storing `desc=30, asc=30` computes to 59/30.
The active round is the *latest* incomplete one (`getActiveRound`), not the first.

**Supabase caps unfiltered selects at 1000 rows.** Use `fetchAllRows`
(`src/lib/supabase.ts`) for any table that grows without bound.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` / `test:watch` | Vitest |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
