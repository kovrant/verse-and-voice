---
type: domain-concept
title: "Monthly Parent Report"
description: "Per-student, per-month progress report the teacher downloads as a PDF and sends to parents."
status: stable
verified: true
sources:
  - "src/lib/monthly-report.ts"
  - "src/lib/monthly-report.test.ts"
  - "src/app/students/[id]/report/page.tsx"
  - "src/app/reports/page.tsx"
  - "src/components/monthly-report-sheet.tsx"
  - "src/components/app-shell.tsx"
  - "supabase/migration_class_session_starting_page.sql"
tags:
  - domain
  - reports
  - parents
  - pdf
---

# Monthly Parent Report

At the start of each month the teacher sends every parent a report on the previous month. Route: **`/students/[id]/report?month=YYYY-MM`** (defaults to last month, PKT), opened from the **Monthly report** button on the student page.

**All students:** `/reports?month=YYYY-MM` (sidebar → Management → Monthly Reports) renders every `status = 'Reading'` student's report, one per printed page (`break-after-page`), so one "Save as PDF" gives the whole month. Both pages share `loadReport()` and `ReportSheet` from `src/components/monthly-report-sheet.tsx`; `/reports` runs one `loadReport` per student in parallel (a `ponytail:` note marks the ceiling).

## 🖨️ How the PDF is made
No PDF library. The route renders an A4 sheet and **Download PDF** calls `window.print()`; the teacher picks "Save as PDF".
* Arabic shaping, the self-hosted fonts and the Indo-Pak jazm render exactly as on screen — PDF libraries handle Arabic badly.
* The sheet uses fixed paper colours (`bg-white`, `neutral-*`, `emerald-*`), not theme tokens, so it prints the same in dark mode.
* `app-shell.tsx` carries print-only classes on the **teacher** shell: sidebar, top bar and background layer are `print:hidden`, and the `h-screen overflow-hidden` frame becomes `print:h-auto print:overflow-visible` (otherwise only the visible scroll area prints). `globals.css` sets `@page { size: A4; margin: 12mm }`. Screen rendering is unchanged.
* The teacher sends the file themselves; nothing is emailed. No parent contact details are stored.

## 📊 Contents and sources
All calculations live in `src/lib/monthly-report.ts` (pure, tested). Month bounds are PKT midnight: `[YYYY-MM-01T00:00:00+05:00, next month)`.

| Section | Source |
|---|---|
| Attendance | `class_sessions` vs `students.class_days`. Scheduled days are counted from enrolment to today; a "missed" day is a scheduled day with no session (absences aren't recorded). Classes on unscheduled days are "extra". |
| Quran / Qaida reading | Start = end of the last session **before** the month; end = last session in the month. Paras = `paras_covered` + start/end paras. Completed rounds from `quran_rounds.completed_at`. |
| Pages read | Per session from `starting_page` → `ending_page`. Sessions saved before `starting_page` existed start where the previous one ended and are marked approximate (`≈`). Crossing a para (either direction — rounds are read both ways) adds the rest of the old para using `student_para_progress.total_pages`; unknown → approximate. |
| Memorization | `student_memorization_chunks.memorized_at` (parts this month); a lesson is "completed" when all its chunks are memorized and the last one falls in the month. |
| Revision | Titles in `class_sessions.memorization_revised`. |
| Hadith, quizzes, stories, trophies | `student_hadith_progress.memorized_at`, `quiz_attempts.completed_at`, `student_story_progress.completed_at`, `student_achievements.earned_at`. Empty sections are hidden. |
| Teacher's notes | `class_sessions.notes`. |
| Fee | `fee_payments` row for that month/year: Paid / Unpaid. |

## 🚫 Not in the report
* **Namaz** — progress is `localStorage` only (see [Namaz](namaz-and-learning.md)).
* **Teacher comment** — deliberately left out (decision 2026-10-11).
