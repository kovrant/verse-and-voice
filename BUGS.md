# Bug Report — quran-academy

Generated 2026-06-12. `tsc --noEmit` passes; all bugs below are logic/runtime issues verified against the code and `supabase/` schema files.

## High

### 1. `ensureFeeRecords` creates unpaid fees past the student's end date — on every page visit
`src/app/students/[id]/page.tsx:212-233` — the loop runs `while (d <= now)` from `started_at` to today with no cap at `ended_at`. Opening the detail page of a student who left in 2023 inserts ~30 bogus unpaid `fee_payments` rows (persisted via upsert), inflating unpaid counts. Write-on-read data corruption.

### 2. `class_sessions` table doesn't exist in any schema/migration file
Used in `src/app/class/page.tsx:115-177` and `src/app/students/[id]/page.tsx:184-195`, but no `CREATE TABLE class_sessions` exists anywhere in `supabase/` (verified by grep), and `migration_auth_rls.sql` has no policy for it. On a DB provisioned from these files, session saves fail and history queries silently return nothing.

### 3. A failed session save permanently bricks the live session
`src/components/live-session.tsx:191-205` sets `setSaving(true)` then calls `onEnd()`. The parent (`src/app/class/page.tsx:161-165`) returns on insert error without any way to reset `saving`. The Save button stays disabled ("Saving..." forever); the session data is unrecoverable without reload. Combined with bug 2, this fires on every save.

### 4. TimePicker fabricates "8:00 AM PKT" on mount, and Clear is impossible
`src/components/ui/time-picker.tsx` — `parseTime("")` returns `{hour:"8", minute:"00", period:"AM"}` (line 317), so the emit effect (lines 192-199) fires on mount with empty `value` and calls `onChange("8:00 AM PKT")`, silently writing a fake class time into any form. The Clear button (lines 238-244) calls `onChange("")` then resets state to 8:00 AM, which re-triggers the same effect and overwrites the clear — the field can never be emptied.

## Medium

### 5. "Already completed" rounds saved as desc=30 AND asc=30 → displays "59/30" (196%)
`src/app/students/[id]/page.tsx:364-365, 408-409` — progress formula everywhere is `desc + max(asc-1, 0)`, so 30/30 computes to 59. Should be desc=30, asc=0.

### 6. `advancePara` at para 30 violates the DB CHECK constraint, error swallowed
`src/components/live-session.tsx:172-188` — `canAdvance` is true at para 30; update sets `asc_completed = 31`, but schema has `CHECK (asc_completed <= 30)` (schema.sql:73). Error never inspected; finishing the final para can't be recorded and the user gets no feedback.

### 7. Race condition selecting students on the Class page
`src/app/class/page.tsx:100-130` — `setSelected(student)` then awaited `Promise.all` with no out-of-order guard. Clicking A then B quickly can attach A's rounds/memorization to B; `advancePara` would then write to A's round while teaching B.

### 8. Middleware redirects drop refreshed auth cookies
`src/middleware.ts:37-49` — `getUser()` may rotate tokens (written to `response` via `setAll`), but both redirect branches return a fresh `NextResponse.redirect()` without copying those cookies. With refresh-token rotation this can log the user out unexpectedly.

### 9. Dashboard fee stats disagree with the Fees page
`src/app/page.tsx:58` — no filter on `students.status` (Fees page drops non-"Reading" students), so departed students count in "Collected/Pending This Month". Also (lines 44-70, 319-328) the dashboard only reads `fee_payments`; at the start of a month, before anyone opens /fees (which creates the rows), it shows "All Clear!" and Rs0 pending — wrong for every active student.

### 10. Foreign-currency fees summed as raw PKR while exchange rates load
`src/app/fees/page.tsx:148-151` and `src/app/page.tsx:96-99` — `convertToPKR` returns `null` both for PKR and when rates haven't loaded; the fallback `?? fee` adds £35 as Rs 35 to totals on every cold load until the rates fetch resolves.

### 11. Media "one-time repair" destructively renames titles on every page load
`src/app/media/page.tsx:109-129` — any `quran` item whose title isn't exactly `Para N` gets the first digit run extracted and is force-renamed in the DB (e.g. "Mushaf Vol 2" → "Para 2"; "Para 1 (large print)" → "Para 1"). User-entered titles are overwritten on next visit.

### 12. `getActiveRound` returns the OLDEST incomplete round
`src/components/quran-progress.tsx:26-28` — `rounds.find(r => !r.completed_at)` on an ascending-ordered list returns the earliest, not latest. "Add Round" doesn't complete the current round, so two incomplete rounds is reachable — then Update/Complete silently target the wrong round.

### 13. Reverting status to "Reading" keeps the stale `ended_at`
`src/app/students/[id]/page.tsx:312-322, 569` — End Date input is hidden for "Reading" but the old `editForm.ended_at` is still saved, so an active student shows "Ended Oct 2023".

### 14. Students list "Quran" column sorts by stale legacy data
`src/app/students/page.tsx:48` — cell renders progress from `quran_rounds`, but sorting uses `students.asc_completed`, written only at creation and never updated.

### 15. Date-only strings parsed as UTC → off-by-one west of UTC
`new Date("YYYY-MM-DD")` is UTC midnight: `students/page.tsx:437` displays admission dates a day early in negative-offset timezones; `ensureFeeRecords` can add a bogus previous-month fee; conversely `toISOString().split("T")[0]` defaults (round dates, new-student form) record "tomorrow" during US evenings.

## Low

### 16. "Another" revision pick button is a no-op
`src/components/live-session.tsx:139-147` — `pickRevision` deterministically returns `sorted[0]` (least recently revised), which is the item already showing. No randomization or exclusion of the current pick.

### 17. Widespread unchecked Supabase errors with silent data loss
- `saveEdit` (`students/[id]/page.tsx:312-327`): empty fee → `parseFloat("") = NaN` → NOT NULL violation; error discarded, dialog closes, edit vanishes.
- `toggleFee` (`fees/page.tsx:104-117` and detail page): optimistic update, no rollback or error toast — paid status can diverge from DB on a money screen.
- `deleteItem` (`media/page.tsx:275-286`): storage + DB errors ignored, success toast always fires.
- `markRevised` (`live-session.tsx:149-158`): revision counted locally even if DB write fails; can push `undefined` into a `string[]`.
- `new/page.tsx:66-73`: failed initial `quran_rounds` insert still navigates away as success.

### 18. Blob URL leak in upload dialog
`src/app/media/page.tsx:576` — `URL.createObjectURL(file)` called inside render, never revoked; leaks one blob per re-render (per keystroke in Title input).

### 19. "Class Time" sorts lexically
`students/page.tsx:47` + `sortable-header.tsx:75-78` — `"h:mm AM/PM"` strings sort via `localeCompare`, so "10:00 AM" < "9:00 AM".

### 20. Unfiltered full-table fetches hit Supabase's 1000-row default cap
`students/page.tsx:116` (`quran_rounds` select all) and the all-sessions fetch in `[id]/page.tsx:184-189` — past 1000 rows, data silently drops.

### 21. `handleEditImage` deletes the old image before the new upload succeeds
`src/app/memorization/page.tsx:186-204` — if upload fails, the old storage object is gone but `image_url` still points at it. Delete after successful upload instead.
