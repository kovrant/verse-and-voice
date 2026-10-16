---
type: log
title: "OKF Change and Curation Log"
description: "Chronological history of updates, additions, and modifications to the Quran Academy OKF catalog."
status: stable
verified: true
sources:
  - "okf/index.md"
tags:
  - log
  - provenance
---

# Knowledge Catalog Curation Log

### [2026-09-24] - Initial Catalog Genesis (v0.2 Standard)
* **Author:** OKF Specialist (Agentic System)
* **Scope:** Full repository review and catalog creation.
* **Entries Created:**
  * Master index (`okf/index.md`) and curation log (`okf/log.md`).
  * Architecture specifications: `dual-portal-routing.md`, `auth-and-roles.md`, `rls-security-model.md`, `realtime-protocol.md`, `timezone-and-dates.md`.
  * Domain logic specifications: `quran-progress-tracking.md`, `qaida-curriculum.md`, `memorization-and-hifz.md`, `live-class-session.md`, `namaz-and-learning.md`, `student-management.md`.
  * Database specifications: `schema-overview.md`, `migration-pipeline.md`, `schema-drift-and-parity.md`.
  * Operations specifications: `development-standards.md`, `known-issues.md` (fully absorbing `BUGS.md`).
* **Motivation:** Establish a single Git-native source of truth for architectural invariants, eliminating silent runtime failures and providing context-efficient guidance for human developers and AI coding agents.

### [2026-09-24] - Student Portal Design System Captured
* **Author:** Claude (pairing session)
* **Scope:** Student portal (`/student/**`) visual language.
* **Entries Created:** `architecture/student-design-system.md`.
* **Entries Updated:** `index.md` (new Architecture entry); `architecture/dual-portal-routing.md` (student portal no longer has a sidebar; cross-link to the design system).
* **Code Change Documented:** The raised "chunky bottom edge" (`box-shadow: 0 Npx 0 <tint>` plus an `active:translate-y` press) was removed from every student surface in favour of the `shadow-soft*` scale and `active:scale-[0.99]`. Students and other reviewers disliked the 3D lip. Commits `cd6ce77`, `d930aa8`, `6dd126f`.
* **Defects Fixed Alongside:** `shadow-soft-md` was referenced by five components but never defined in `tailwind.config.js`, so it rendered nothing; the unused `.btn-chunky` / `.btn-chunky-accent` utilities were deleted from `globals.css`.
* **Drift Recorded:** `globals.css` line 1 imports Arabic faces from the Google Fonts CDN, contradicting the self-hosted-fonts rule asserted in `dual-portal-routing.md`.
* **Motivation:** The design system was the largest undocumented area of the codebase and the one most exposed to accidental teacher-side regressions; the `kid` prop contract needed to be written down before the next restyle.

### [2026-09-24] - Arabic Fonts Self-Hosted
* **Author:** Claude (pairing session)
* **Scope:** Font loading across both portals.
* **Entries Updated:** `operations/known-issues.md` (issue 6 removed — resolved); `architecture/student-design-system.md` (invariants 6 and 7 now state the real font rule and the Arabic stack); `architecture/dual-portal-routing.md`.
* **Code Change Documented:** Dropped the `@import url('https://fonts.googleapis.com/...')` from `globals.css:1`. Scheherazade New and Noto Naskh Arabic (Arabic subsets, 400/600/700) were copied from `@fontsource` into `src/app/fonts/` and registered with `next/font/local` as `--font-scheherazade` and `--font-naskh`. The three Arabic stacks in `tailwind.config.js` and the `font-arabic` utility in `globals.css` now reference those variables instead of bare family names, which `next/font` hashes and would no longer have matched.
* **Motivation:** Removes a render-blocking third-party request and a per-page-load privacy leak to Google on behalf of every student, and makes Quranic text render correctly with the CDN blocked or offline. Amiri had been downloaded twice (self-hosted *and* from the CDN).

### [2026-09-25] - Storage Caching and the Decision Not to Migrate
* **Author:** Claude (pairing session)
* **Scope:** Supabase Storage, egress cost, hosting choice.
* **Entries Created:** `operations/storage-and-caching.md`.
* **Entries Updated:** `index.md`.
* **Code Change Documented:** All six upload sites now pass `CACHE_FOREVER` (`"31536000"`) from the new `src/lib/storage.ts` instead of the literal `"3600"`. At one hour, both teacher and student re-downloaded the same ~8 MB para PDF at every class, which was the bulk of project egress and would have breached the 5 GB free allowance at 15 students.
* **Operational Work:** `scripts/storage-recache.mjs` re-stamped all 155 existing objects (261.4 MB, 0 failures) with the one-year cache, since Supabase fixes `cacheControl` at upload time and offers no metadata-only update. A full local backup was taken in the same pass. Stored metadata confirmed as `max-age=31536000`; **serve-side verification via ranged GET was still outstanding when this was written** — run `scripts/storage-verify-cache.mjs`.
* **Decision Recorded:** Stay on Supabase. Google Drive rejected as a serving origin (no Range support, per-file download quotas, no CORS, no stable direct URL). Video goes to YouTube rather than object storage. Revisit at ~800 MB stored or if video must be self-hosted, in which case Cloudflare R2.
* **Measurement:** 155 objects, 261.4 MB, 26% of the 1 GB free tier. The 30 para PDFs are 96% of stored bytes.

### [2026-09-25] - Indo-Pak Jazm for App-Rendered Arabic
* **Author:** Claude (pairing session)
* **Scope:** Arabic rendering across both portals.
* **Entries Updated:** `architecture/student-design-system.md` (new invariant 8).
* **Reported By:** A student found the Namaz Arabic hard to read. Diagnosis: the app drew sukun as the Uthmani small circle (`U+0652` default glyph) while the mushaf he reads uses the Indo-Pak open hook, so he was shown a mark he had never seen.
* **Code Change Documented:** `.font-arabic` / `.font-hadith` / `.font-amiri` now set `font-feature-settings: "cv78" 2`, and the three Scheherazade New files were replaced with subsets of SIL's own OFL release (+25 KB total), because the Google Fonts build strips character variants. Verified against the shipped `.woff2` and the shipped CSS rule.
* **Decision Recorded:** Fixed in the font, not the data. Swapping the stored text to `U+06E1` would have produced the same glyph but left the data non-standard; the font route also covers the Hadith seed and the live-class tajweed cards, and any Arabic pasted in later, with no migration.

### [2026-09-26] - RLS Audit and Hardening Migration
* **Author:** Claude (pairing session), using Supabase's official `supabase` agent skill checklist.
* **Scope:** Every policy in `supabase/*.sql`, replayed in apply order, then confirmed against live `pg_policies`.
* **Entries Updated:** `architecture/rls-security-model.md` (gotchas 3–6), `database/schema-drift-and-parity.md` (discrepancy 3), `database/migration-pipeline.md` (step 25).
* **Findings (live):** policies granted to `public` — i.e. anyone, unauthenticated — allowed writing/deleting both storage buckets (including all 30 Quran para PDFs), full read/write of `quizzes`, `quiz_questions`, `quiz_assignments`, `quiz_attempts` (every child's answers and scores), and full read/write of `class_sessions` including teacher notes.
* **Sound:** no self-promotion path (`profiles` is read-own, teacher-write; `is_teacher()` reads `profiles.role`, never user metadata); students, fees, rounds, memorization, Namaz, achievements and notifications correctly scoped; RLS enabled on all 31 tables; no views; no `user_metadata`.
* **Low / not fixed:** students can update their own progress rows (row scope correct, but RLS cannot restrict columns); `auth.role() = 'service_role'` in `migration_hadiths.sql` is deprecated and redundant; `quiz_questions` may expose correct answers before an attempt.
* **Fix:** `migration_rls_hardening.sql` — hand-applied like the others.

### [2026-09-26] - Namaz Step Viewer Redesign and Translations
* **Author:** Claude (pairing session)
* **Scope:** Student Namaz step screen; `namaz_step_parts` schema.
* **Entries Updated:** `domain/namaz-and-learning.md` (translation column, image fallback, new viewer section), `database/migration-pipeline.md` (step 26).
* **Change:** Adds `namaz_step_parts.translation` (seeded for all 14 shipped parts, teacher-editable). Replaces the stacked card list with `NamazStepViewer`: one part per screen, large bold Arabic, English meaning underneath, posture picture beside it on desktop and above it on phones.

### [2026-09-28] - 6-Vector Web Application & Supabase Security Hardening
* **Author:** Principal AppSec Audit (Pairing Session)
* **Scope:** Database RLS/triggers (`supabase/migration_security_hardening.sql`), API route guards (`src/lib/api-auth.ts`, `src/app/api/**`), auth redirects (`src/lib/student-auth.ts`, `src/app/admin/page.tsx`), storage uploads (`src/lib/media-upload.ts`), and HTTP security headers (`next.config.js`).
* **Entries Updated:** `architecture/rls-security-model.md`, `database/migration-pipeline.md` (step 27), `log.md`.
* **Vulnerabilities Remediated:**
  * **BOPLA / Privilege Escalation:** Removed student `FOR ALL` write access on `student_hadith_progress`; added `BEFORE UPDATE` column-immutability triggers on `student_namaz_steps` (locking `unlocked_at`, `completed_at`, `revision_*`) and `notifications` (locking payload columns so only `read_at` is mutable).
  * **Suspended Account Enforcement:** Enforced `!isLoginDisabled` inside `public.my_student_id()`, `public.is_teacher()`, `requireTeacher()`, `requireStudentOrTeacher()`, `/api/activity`, `/api/presence`, and `/admin`.
  * **Unpublished Quiz Leak:** Restricted student `SELECT` on `quizzes` and `quiz_questions` (and `/api/quizzes/complete`) to `is_published = true`.
  * **Open Redirect & Storage XSS:** Added `teacherPostLoginPath()` on `/admin`, blocked `.svg`/`.html` in `fileTypeOf()` / `safeUploadExtension()` and `storage.buckets.allowed_mime_types`, moved Gemini API key from URL query string to `x-goog-api-key` header, fixed notification deduplication for quiz/hadith assignments, and added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers in `next.config.js`.

### [2026-09-28] - Teacher Student Detail Workspace ("Teaching Desk") UX Redesign
* **Author:** UI/UX & Technical Design Pairing Session
* **Scope:** `src/app/students/[id]/page.tsx`, `src/components/student-detail-nav.tsx`, `src/components/student-overview.tsx`, `src/components/student-namaz-assign.tsx`, `src/components/student-qaida-assign.tsx`, `src/components/student-hadith-quiz-card.tsx`, `src/app/api/hadiths/assign/route.ts`.
* **Entries Updated:** `domain/student-management.md`, `log.md`.
* **Changes:**
  * Replaced the 6-tab vertical sidebar with a full-width 3-Mode Top Segmented Bar (`Teaching Desk`, `History & Trophies`, `Billing & Access`) preserving all existing theme colors and fonts.
  * Converted `StudentOverview` into an interactive 2×2 **Teaching Desk** combining inline Quran Para `-`/`+` steppers, embedded Qaida book selector, interactive Memorization chunk checklists + collapsible Revision Bucket, Namaz step/revision controls (moved out of the `Account` tab), and a new `StudentHadithQuizCard` for inline Hadith/Quiz assignment and grading.
  * Added live schedule, online/device badges, and a 1-click Current Month Fee toggle button directly to the student command header.

### [2026-09-29] - Open Namaz Access & Teaching Desk Card Split
* **Author:** Technical Architecture & UI/UX Pairing Session
* **Scope:** `src/app/student/namaz/page.tsx`, `src/components/student-home-cards.tsx`, `src/components/student-nav.tsx`, `src/components/student-overview.tsx`, `src/components/student-hadith-quiz-card.tsx`, `src/lib/achievements/backfill.ts`, `supabase/migration_namaz_open_access.sql`.
* **Entries Updated:** `domain/namaz-and-learning.md`, `log.md`.
* **Changes:**
  * Removed per-student Namaz assignment (`StudentNamazAssign` and `useStudentNamazRealtime`) and gave all authenticated students open access to `/student/namaz` (`namaz_steps` and `namaz_step_parts`). Memorization of Namaz parts uses the unified Memorization & Revision module (`category = 'Namaz'`).
### [2026-10-05] - Gemini AI Quota Circular Dashboard Meter & Dedicated `/ai-usage` Portal
* **Author:** Technical Architecture & UI/UX Pairing Session
* **Scope:** `src/app/page.tsx`, `src/components/gemini-quota-card.tsx`, `src/app/ai-usage/page.tsx`, `src/components/sidebar.tsx`, `okf/domain/gemini-ai-quota-and-usage.md`.
* **Entries Created:** `domain/gemini-ai-quota-and-usage.md`.
* **Entries Updated:** `index.md`, `log.md`.
* **Changes:**
  * Replaced the wide full-width linear progress AI Quota card on the teacher dashboard with a compact half-screen card (`lg:col-span-1`) featuring a 70×70px circular SVG gauge showing remaining daily allowance.
  * Elevated the **Quick Actions Hub** alongside the quota card in a balanced 2-column top grid, bringing classroom action buttons and the Live Activity Feed directly into the viewport without scrolling.
  * Filtered noisy daily token metrics (`TOKENS TODAY`, `MONTH TOKENS`, `RATE LIMIT`) off the main dashboard, reserving alerts exclusively for high usage (>80%) or critical quota exhaustion (<=50 RPD remaining).
  * Built a dedicated `/ai-usage` route providing complete token telemetry, live PT midnight reset countdown, rate limits (15 RPM), recent LLM generation logs, and direct link to Google AI Studio.
  * Added navigation link for `AI Usage` in the main sidebar under Management.

### [2026-10-07] - Namaz: No Badges, No Certificates
* **Scope:** `src/lib/achievements/*`, `src/components/trophy-case.tsx`, `src/app/student/achievements/page.tsx`, `src/lib/namaz.ts`, `src/components/namaz-step-viewer.tsx`, `src/components/namaz-step-card.tsx`, `supabase/migration_namaz_remove_badge.sql`.
* **Entries Updated:** `domain/namaz-and-learning.md`, `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * Removed the `namaz_complete` badge/certificate, the `namaz` trophy domain, the "Namaz badge" locked hint, and the dead per-student unlock/revision helpers and viewer props. `/student/namaz` is a plain open guide.

### [2026-10-07] - Namaz Phase 1: Guidance Data Model
* **Scope:** `src/lib/namaz.ts`, `src/lib/namaz.test.ts`, `supabase/migration_namaz_guidance.sql`.
* **Entries Updated:** `domain/namaz-and-learning.md`, `domain/namaz-review-list.md` (new), `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * Added per-part action text, word-by-word transliteration, repeat counts, audio/timing slots and a review flag; seeded all 14 live parts (validated against the live Arabic word counts) and fixed the "Rabbiyal" spellings.
  * Added pure journey helpers (`flattenNamaz`, `findStop`, `stepSlug`, `wordChips`, `evenWordTimings`, `activeWordIndex`) with tests.

### [2026-10-07] - Namaz Phase 2: Continuous Learn Journey
* **Scope:** `src/app/student/namaz/page.tsx`, `src/components/namaz-journey.tsx` (new), `src/components/namaz-part-panel.tsx` (new), `src/lib/namaz-progress.ts` (new), `src/lib/namaz.ts`, `src/middleware.ts`; removed `src/components/namaz-step-viewer.tsx`.
* **Entries Updated:** `domain/namaz-and-learning.md`, `log.md`.
* **Changes:**
  * Next/Back cross step boundaries; URL deep links with sensible browser Back; progress bar; word chips with karaoke audio; Continue/Start and viewed ticks stored in localStorage.
  * Middleware now keeps the query string in `redirectTo`, so a signed-out deep link survives login.

### [2026-10-07] - Namaz Phase 3: Teacher Audio Tools
* **Scope:** `src/app/namaz/audio/page.tsx` (new), `src/components/namaz-audio-row.tsx` (new), `src/app/namaz/page.tsx`, `src/lib/namaz.ts`, `src/lib/namaz.test.ts`, `supabase/migration_namaz_audio.sql` (new).
* **Entries Updated:** `domain/namaz-and-learning.md`, `domain/namaz-review-list.md`, `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * Teacher page to record, upload, replace and delete each part's audio in the new `namaz-audio` bucket (public read, teacher-only write).
  * Tap-to-time word timings (button or Space) with a live student-panel preview, save and reset.
  * Needs-review filter with per-part Approve.

### [2026-10-07] - Namaz: Learn Mode Only
* **Scope:** `src/app/student/namaz/page.tsx`.
* **Entries Updated:** `domain/namaz-and-learning.md`, `log.md`.
* **Changes:**
  * Dropped the planned Pray Along and Challenge modes (and the Namaz Star badge). Removed the mode row and the "coming soon" buttons; the guide is the step grid plus the Learn journey with pictures and teacher audio.

### [2026-10-09] - AI Usage Logs RLS Fix
* **Scope:** `supabase/migration_ai_usage_logs.sql`, `supabase/migration_ai_usage_logs_rls_fix.sql` (new).
* **Entries Updated:** `architecture/rls-security-model.md`, `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * `ai_usage_logs` had `USING (true)` / `WITH CHECK (true)` policies with no `TO` clause, so `anon` could read every log row and insert fake rows into the quota meter. Replaced with a teacher-only `FOR ALL TO authenticated` policy; all app access already goes through the service role (`/api/ai/usage`, `/api/quizzes/generate`, `/api/history/generate`).

### [2026-10-09] - Migration Pipeline: Complete Run Order
* **Scope:** `supabase/*.sql` (docs only; no SQL changed).
* **Entries Updated:** `database/migration-pipeline.md`, `database/schema-drift-and-parity.md`, `operations/known-issues.md`, `log.md`.
* **Changes:**
  * Placed the eight unlisted files (`migration_student_para_progress`, `migration_bookmark`, `migration_student_device`, `migration_namaz_arabic`, `migration_namaz_realtime`, `migration_quizzes`, `migration_hadiths`, `migration_namaz_open_access`) by their real dependencies and renumbered to one 41-step sequence.
  * Flagged `migration_qaida_live_class.sql` as never committed, the quizzes/hadiths achievement domain-check clash, and `migration_namaz_open_access.sql` having to follow `migration_security_hardening.sql`.
  * Marked the `student_para_progress` DDL and `class_sessions` column drift resolved; the live `UNIQUE(student_id, para_number)` is still uncommitted.

### [2026-10-09] - Qaida Bookmarks and 16-Line Mushaf
* **Scope:** `supabase/migration_para_progress_fixes.sql` (new), `migration_security_hardening.sql`, `migration_bookmark.sql`, `migration_student_para_progress.sql`, `schema.sql`, `src/lib/mushaf-pointer.ts`, `src/components/synced-pdf-viewer.tsx`.
* **Entries Updated:** `domain/live-class-session.md`, `domain/qaida-curriculum.md`, `database/migration-pipeline.md`, `database/schema-drift-and-parity.md`, `operations/known-issues.md`, `log.md`.
* **Changes:**
  * `student_para_progress_bounds_check` required `para_number BETWEEN 1 AND 30`, so every Qaida bookmark (`para_number = 0`) failed and fell back to `localStorage`. Now `0..30`.
  * The para PDFs are a 16-line mushaf. `DEFAULT_MUSHAF_LINES` is now 16, and the `last_line` / `ending_line` checks allow `1..16`. Margin ratios unchanged (not re-measured).
  * `UNIQUE(student_id, para_number)` is now declared in committed SQL; the drift item is resolved.

### [2026-10-10] - README: Point to Canonical Migration Order
* **Scope:** `README.md` (docs only; no SQL changed).
* **Entries Updated:** `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * Removed README's older, duplicated `supabase/*.sql` run order (it still listed the never-committed `migration_qaida_live_class.sql` and missed later files) and replaced it with a pointer to `database/migration-pipeline.md`.
  * Kept README-only context: SQL Editor note, backfill files, teacher-promotion block, drift warning.

### [2026-10-10] - Qaida in the Live Class
* **Scope:** `src/app/class/page.tsx`, `src/components/class-student-card.tsx` (+ new `class-student-card.test.ts`), `src/components/live-session.tsx`, `src/components/student-live-class.tsx`, `src/components/student-session-bits.tsx`, `src/lib/notify.ts`, `src/lib/qaida.ts`. No SQL changed.
* **Entries Updated:** `domain/qaida-curriculum.md`, `domain/live-class-session.md`, `database/migration-pipeline.md`, `log.md`.
* **Changes:**
  * A student on an active Qaida round used to get Quran Para 1 in class. The class page now resolves the assigned Qaida book (`students.qaida_media_id`) and teaches it as the sentinel para `0`; with no book assigned, Start Class is disabled with a hint.
  * `classPosition()` returns para 0 for a Qaida round, at the latest `ending_para = 0` session's page/line. Para prev/next and "Advance to Para" are hidden on para 0.
  * The student live view maps its own Qaida book to para 0.
  * Fixed falsy-0 checks: `handleEndSession` skipped the para-0 bookmark (`if (data.endingPara && …)`), and the session-ended notification body dropped para 0.
  * New `paraLabel()` / `QAIDA_PARA` in `src/lib/qaida.ts`; session summaries and notifications show "Norani Qaida" for 0.
  * `migration_qaida_live_class.sql` is confirmed unnecessary: the feature is app code only.

### [2026-10-11] - Monthly Parent Report
* **Scope:** `src/lib/monthly-report.ts` (new), `src/lib/monthly-report.test.ts` (new), `src/app/students/[id]/report/page.tsx` (new), `src/app/students/[id]/page.tsx`, `src/components/app-shell.tsx`, `src/app/globals.css`, `src/components/live-session.tsx`, `src/app/class/page.tsx`, `supabase/migration_class_session_starting_page.sql` (new).
* **Entries Updated:** `domain/monthly-parent-report.md` (new), `domain/live-class-session.md`, `database/migration-pipeline.md`, `index.md`, `log.md`.
* **Changes:**
  * Print-ready A4 monthly report per student with a month picker and Download PDF (browser "Save as PDF"); opened from a "Monthly report" button on the student page.
  * Pure, tested calculations for PKT month bounds, attendance, reading position and pages, memorization and revisions.
  * Live classes now save `starting_page` so pages read are exact going forward; the insert retries without it on older databases.
  * Teacher shell gets print-only classes so only the page content prints, at full height.

### [2026-10-11] - Monthly Reports: All Students
* **Scope:** `src/app/reports/page.tsx` (new), `src/components/monthly-report-sheet.tsx` (new, moved from the per-student page), `src/app/students/[id]/report/page.tsx`, `src/components/sidebar.tsx`.
* **Entries Updated:** `domain/monthly-parent-report.md`, `index.md`, `log.md`.
* **Changes:**
  * `/reports` prints every active student's report, one per page, for a single "Save as PDF"; linked in the sidebar under Management.
  * Report loading and the A4 sheet moved into a shared component used by both pages.

### [2026-10-12] - Monthly Report Moves Into the Student Page
* **Scope:** `src/components/monthly-report-sheet.tsx`, `src/components/student-detail-nav.tsx`, `src/app/students/[id]/page.tsx`, `src/components/sidebar.tsx`; removed `src/app/reports/page.tsx` and `src/app/students/[id]/report/page.tsx`.
* **Entries Updated:** `domain/monthly-parent-report.md`, `index.md`, `log.md`.
* **Changes:**
  * The report is now a **Monthly Report** tab on the student page with a month picker and Download PDF, at the teacher's request. The separate Monthly Reports section, its sidebar link and the standalone report route are gone.
  * Student page chrome is hidden when printing so only the report sheet goes into the PDF.

### [2026-10-12] - Class Attendance
* **Scope:** `supabase/migration_class_attendance.sql` (new), `src/lib/attendance.ts`, `src/lib/attendance.test.ts`, `src/lib/class-time.ts`, `src/lib/class-time.test.ts`, `src/app/class/page.tsx`, `src/components/class-today-attendance.tsx` (new), `src/components/class-student-picker.tsx`, `src/components/class-student-card.tsx`, `src/components/student-attendance-calendar.tsx` (new), `src/components/student-overview.tsx`, `src/app/students/[id]/page.tsx`.
* **Entries Updated:** `domain/class-attendance.md` (new), `domain/live-class-session.md`, `domain/student-management.md`, `database/migration-pipeline.md` (step 44), `index.md`, `log.md`.
* **Changes:**
  * New `class_attendance` table (one status per student per PKT date: present, student absent, teacher absent, holiday) with teacher-all / student-read RLS.
  * Saving a class marks that day present (best-effort, never blocks the save).
  * "Today's attendance" card on the `/class` landing with per-student statuses plus "I'm absent today", "Holiday today" and "Clear day off".
  * Attendance month calendar in the student page's Sessions tab for marking past days.
  * Pure, tested helpers: `isScheduledDay`, `scheduledDates`, `buildAttendanceDays` (mark > session > unmarked), `summarizeAttendance`. Picker sort extracted to `compareByClassTime`.

### [2026-10-12] - Monthly Report: Brand Design, Class Days, Paras & Pages
* **Scope:** `src/components/monthly-report-sheet.tsx`, `src/lib/monthly-report.ts`, `src/lib/monthly-report.test.ts`, `src/app/globals.css`.
* **Entries Updated:** `domain/monthly-parent-report.md`, `domain/class-attendance.md`, `log.md`.
* **Changes:**
  * Report restyled in the Verse & Voice brand (cream, forest, peach, sage, gold; crescent, leaves, geometric corners) with a full-bleed cream printed page.
  * Class Days strip from `class_attendance` marks + sessions; "classes attended" excludes teacher-absent and holiday days.
  * 18 pages per para by default (16-line mushaf), paras completed this month and round progress `x / 30`.
  * Removed the trophies and teacher's-notes sections.

### [2026-10-12] - Student "My class days" Uses Attendance Marks
* **Scope:** `src/app/student/attendance/page.tsx`, `src/lib/attendance.ts`, `src/lib/attendance.test.ts`.
* **Entries Updated:** `domain/class-attendance.md`, `log.md`.
* **Changes:**
  * The kid page reads `class_attendance` marks: teacher's days off and holidays show as such and no longer count against the child; make-up classes appear as "Extra class".
  * Months and days are PKT instead of the device timezone, so parents abroad see classes on the right day.
  * Removed the unused device-timezone `buildMonthAttendance` / `localDateKey`.

### [2026-10-12] - Streak Ignores Teacher Days Off
* **Scope:** `src/lib/streak.ts`, `src/lib/streak.test.ts`, `src/components/student-streak-card.tsx`, `src/app/student/classes/page.tsx`.
* **Entries Updated:** `domain/class-attendance.md`, `log.md`.
* **Changes:**
  * `computeStreak` takes `class_attendance` marks: teacher-absent and holiday days no longer break a child's streak, and a day marked present counts.
  * Streak days are PKT instead of the device timezone; tests pin dates to PKT noon and pass under US/UK test timezones.

### [2026-10-12] - Monthly Report: Reading Is Net Movement
* **Scope:** `src/lib/monthly-report.ts`, `src/lib/monthly-report.test.ts`, `src/components/monthly-report-sheet.tsx`.
* **Entries Updated:** `domain/monthly-parent-report.md`, `log.md`.
* **Changes:**
  * Paras and pages completed now come from the month's start position → end position. Summing every session counted the teacher clicking between paras as reading (Ahmed's Sep report showed "Para 20 ✓, Para 22 ✓" for a month spent finishing Para 22) and inflated pages.
  * Fixed an off-by-one in pages when crossing a para (the start page itself counts).

### [2026-10-13] - Live Class Connection Self-Heals
* **Scope:** `src/lib/use-class-channel.ts`, `src/components/live-class-provider.tsx`, `src/app/student/classes/page.tsx`, `src/lib/activity-log.ts`, `src/app/api/activity/route.ts`, `src/components/student-activity-feed.tsx`.
* **Entries Updated:** `architecture/realtime-protocol.md`, `log.md`.
* **Changes:**
  * Zoyal couldn't join a live class: her portal never detected the teacher and the "Tap to join" notification only opened the Classes page. A failed realtime subscribe was silently ignored.
  * The class channel now retries failed subscribes with backoff, rebuilds on tab wake / network return, and exposes `reconnect()`; the student Classes page offers "Teacher already started? Tap here".
  * New `live_class` activity event records connection failures and recoveries for the teacher to see.

### [2026-10-14] - Public Welcome Landing Page
* **Scope:** `src/app/welcome/page.tsx`, `src/components/welcome/*`, `src/middleware.ts`, `src/components/app-shell.tsx`, `src/components/theme-provider.tsx`, `src/app/layout.tsx`.
* **Entries Added:** `architecture/public-welcome-page.md`; `index.md` updated.
* **Changes:**
  * New public `/welcome` route: a ten-chapter scroll story (dawn → night) built on the student palette and `kid-ui`, outside the app shell.
  * `/welcome` added to `PUBLIC_PATHS` and to both student-palette stampers (`portalForPath` and the layout first-paint script).
  * Trial-request form is local-only for now; parent quotes are unnamed placeholders.
  * Later the same day: replaced the first build with a 1:1 port of the owner's approved Claude Design mock (`Verse and Voice.dc.html`); `welcome-art.tsx` removed, Framer Motion no longer used on the page.
  * Front door: `/` now serves the website to visitors without a session (middleware rewrite + `x-vv-landing` header read by the root layout). Signed-in teachers keep the dashboard at `/`, students still go to `/student`.
  * Fix: after a client-side navigation from /login to "/", the teacher sidebar wrapped the website (the root layout kept its first render). Shell and palette now key off `useSelectedLayoutSegment() === "welcome"` instead of a request header.

### [2026-10-16] - Teacher Portal Moves Under /teacher
* **Scope:** `src/app/teacher/**` (moved from the root), `src/middleware.ts`, `src/lib/student-auth.ts`, `src/components/sidebar.tsx`, `src/components/app-shell.tsx`, `src/components/topbar.tsx`, `src/app/auth/signout/route.ts`, `src/lib/notify.ts`, `next.config.js`, every teacher link.
* **Entries Updated:** `architecture/dual-portal-routing.md`, `architecture/public-welcome-page.md`, `README.md`, `log.md`.
* **Changes:**
  * The dashboard and all teacher pages now live under `/teacher/**`; the teacher login is `/teacher/login`. `/` is the public website for everyone except signed-in students.
  * `/admin` and the old root paths (`/students/…`, `/class`, …) redirect to their `/teacher` equivalents, so bookmarks and notification links keep working.
  * `teacherPostLoginPath` accepts only `/teacher/**` and falls back to `/teacher`.
  * Chapter 6 is now the five daily prayers on a dawn-to-night arc (`PrayerDay`); the namaz-table loader `src/lib/welcome-namaz.ts` is removed and the page is static again.
