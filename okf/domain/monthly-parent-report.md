---
type: domain-concept
title: "Monthly Parent Report"
description: "Per-student, per-month progress report the teacher downloads as a PDF and sends to parents."
status: stable
verified: true
sources:
  - "src/lib/monthly-report.ts"
  - "src/lib/monthly-report.test.ts"
  - "src/app/students/[id]/page.tsx"
  - "src/components/student-detail-nav.tsx"
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

At the start of each month the teacher sends every parent a report on the previous month. It lives in the **Monthly Report** tab of the student page (`/students/[id]`), next to Trophies: a month picker (defaults to last month, PKT), **Download PDF**, and the report shown inline. `StudentMonthlyReport` in `src/components/monthly-report-sheet.tsx` renders it.

There is deliberately **no separate reports section or all-students page** — the teacher asked for it per student, inside the student page (a `/reports` page and a `/students/[id]/report` route were built and removed on 2026-10-12).

## 🖨️ How the PDF is made
No PDF library. The tab renders an A4 sheet and **Download PDF** calls `window.print()`; the teacher picks "Save as PDF". The student page's breadcrumb, header, tab bar and the tab's toolbar are `print:hidden`, so only the sheet prints.
* Arabic shaping, the self-hosted fonts and the Indo-Pak jazm render exactly as on screen — PDF libraries handle Arabic badly.
* **Brand look** (matches the Verse & Voice Canva/Instagram posts and the student portal): cream paper `#F8F6EE`, forest-green Baloo 2 headings, peach pills, sage leaf sprigs, gold crescent-and-stars and geometric corners, all inline SVG. Fixed hex colours (`BRAND` in the sheet), not theme tokens, so it prints the same in dark mode. `globals.css` sets `@page { margin: 0 }` and a cream print background so the page is full-bleed; the sheet carries its own print padding.
* `app-shell.tsx` carries print-only classes on the **teacher** shell: sidebar, top bar and background layer are `print:hidden`, and the `h-screen overflow-hidden` frame becomes `print:h-auto print:overflow-visible` (otherwise only the visible scroll area prints). `globals.css` sets `@page { size: A4; margin: 12mm }`. Screen rendering is unchanged.
* The teacher sends the file themselves; nothing is emailed. No parent contact details are stored.

## 📊 Contents and sources
All calculations live in `src/lib/monthly-report.ts` (pure, tested). Month bounds are PKT midnight: `[YYYY-MM-01T00:00:00+05:00, next month)`.

| Section | Source |
|---|---|
| Class days | `buildAttendanceDays` from [Class Attendance](class-attendance.md): scheduled days (enrolment → today) plus any day with a session or mark, each Read / Absent / Teacher away / Holiday / Not marked, shown as a strip of day chips (dashed = extra class). "Classes attended" = present ÷ scheduled days that weren't teacher-absent or holiday (`attendanceTotals`). |
| Quran / Qaida reading | **Net movement** (`computeReadingProgress`): start = end of the last class before the month (first tracked month: the first class's recorded opening page if any, else where it ended); end = where the last class ended. Moves in between are ignored on purpose — the teacher often opens a class on one para and clicks to another to find the place, and sessions can end on a para that was only browsed (Ahmed, Sep 2026: "Para 20 ✓, Para 22 ✓" before this rule). Completed rounds from `quran_rounds.completed_at`. |
| Pages completed | Page distance from start to end: same para → difference; otherwise the rest of the start para (`size − page + 1`), every para in between, and `page − 1` into the end para. Size = `student_para_progress.total_pages`, else `DEFAULT_PARA_PAGES = 18` (16-line mushaf). `≈` when the month's starting page wasn't recorded. |
| Paras completed | Every Quran para from the start para up to (not including) the end para, in either direction; Qaida is never counted. Plus round progress `x / 30` from the active round (`computeProgress`). |
| Memorization | `student_memorization_chunks.memorized_at` (parts this month); a lesson is "completed" when all its chunks are memorized and the last one falls in the month. |
| Revision | Titles in `class_sessions.memorization_revised`. |
| Hadith, quizzes, stories | `student_hadith_progress.memorized_at`, `quiz_attempts.completed_at`, `student_story_progress.completed_at`. Empty sections are hidden. |
| Fee | `fee_payments` row for that month/year: Paid / Unpaid. |

## 🚫 Not in the report
* **Trophies and badges** — left out until the teacher decides how to present them (2026-10-12).
* **Teacher's class notes** — removed at the teacher's request (2026-10-12).
* **Namaz** — progress is `localStorage` only (see [Namaz](namaz-and-learning.md)).
* **Teacher comment** — deliberately left out (decision 2026-10-11).
