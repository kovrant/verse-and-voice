# Known Bugs

Last verified 2026-08-09 against the working tree. The previous list (2026-06-12) had
21 entries; 18 were re-checked line by line and confirmed fixed, so they were removed.
What remains below is live. Two new issues found during that pass are included.

## High

### 1. `student_para_progress` has no `CREATE TABLE` anywhere

`src/lib/para-progress.ts` reads and writes the table, and
`supabase/migration_para_progress_rls.sql` adds RLS policies to it — but no migration
ever creates it. It exists only in the production database.

A database provisioned from `supabase/*.sql` will not have the table, so the live
class's "resume at last page" and the debounced page-save both fail.

### 2. `class_sessions` is missing the `ending_page` and `last_page` columns

`src/app/class/page.tsx:173-174` inserts both on every session save, but
`supabase/migration_class_sessions.sql` declares neither (it has `starting_para` /
`ending_para` only, and no `ending_page` / `last_page`). Same cause as 1: the columns
were added directly to production.

On a database built from the migration files, every class-session save fails.

> 1 and 2 are one problem: **the schema's source of truth is the live database, not
> the repo.** Fixing the two symptoms above without fixing that just delays the next
> instance. `supabase db pull` would capture the real schema as a baseline migration.

## Low

### 3. Round dates parsed as UTC in the class-page journey timeline

`src/app/class/page.tsx:422-423,434` — `new Date(r.started_at)` on `quran_rounds`
dates, which are date-only `YYYY-MM-DD` strings written by `formatLocalDate()`. Parsed
as UTC midnight, they land on the previous day for viewers west of UTC, shifting stage
durations by a day.

Latent for the teacher (PKT is UTC+5, so UTC midnight is 5am the same day) — it only
manifests in negative-offset timezones. `src/components/quran-journey.tsx:213-214`
already does this correctly with `parseLocalDate`; the class page was just missed.

### 4. Two incomplete Quran rounds are still reachable via Edit Round

`saveEditRound` in `src/app/students/[id]/page.tsx` can clear `completed_at` on an
older round while a newer one is open. "Add Round" no longer causes this (it closes
the active round first), and `getActiveRound` now picks the *latest* incomplete round,
so the old "silently updates the wrong round" consequence is gone. What's left is a
data state that shouldn't exist.

### 5. Student list fetches all students unpaginated

`src/app/students/page.tsx:113` uses a plain `.select("*")` on `students`, so it
silently truncates at Supabase's 1000-row default. The `quran_rounds` fetch beside it
was already converted to `fetchAllRows`; this one wasn't. Not reachable at current
student counts.
