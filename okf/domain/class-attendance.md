---
type: domain-concept
title: "Class Attendance"
description: "Explicit per-day attendance (present, student absent, teacher absent, holiday) on PKT class dates, how it combines with class sessions, and where the teacher marks it."
status: stable
verified: true
sources:
  - "supabase/migration_class_attendance.sql"
  - "src/lib/attendance.ts"
  - "src/lib/attendance.test.ts"
  - "src/app/class/page.tsx"
  - "src/components/class-today-attendance.tsx"
  - "src/components/student-attendance-calendar.tsx"
  - "src/app/students/[id]/page.tsx"
tags:
  - domain
  - attendance
  - live-class
  - pkt
---

# Class Attendance

Classes are 1-on-1 on each student's scheduled weekdays (`students.class_days`, `0` = Sunday … `6` = Saturday). Before this table the app only knew a class happened when a `class_sessions` row existed, so a missed day could be the student's absence, the teacher's, or a holiday. `class_attendance` records which.

---

## Statuses

| Status | Meaning | Counts against the student? |
|---|---|---|
| `present` | The class happened. | No |
| `student_absent` | The teacher was there, the student didn't come. | Yes |
| `teacher_absent` | The teacher couldn't teach. | **No** |
| `holiday` | Planned day off (Eid, school holiday). | Neither way |

Labels live in `ATTENDANCE_LABELS` (`src/lib/attendance.ts`).

## Table

`public.class_attendance`: `student_id` (cascade delete), `class_date date`, `status`, `created_at`, `updated_at`, `UNIQUE (student_id, class_date)`. One row per student per day; writes are upserts on `student_id,class_date`. Clearing a mark deletes the row.

`class_date` is a **PKT calendar date** (`Asia/Karachi`, UTC+5, no DST). Instants are converted with `pktDateKey()` from `src/lib/monthly-report.ts`; weekdays come from the date itself (`Date.UTC(...).getUTCDay()`), never the viewer's timezone. See [Timezone and Dates](../architecture/timezone-and-dates.md).

## Precedence

`buildAttendanceDays()` returns one entry per date that is scheduled, has a session, or has a mark:

1. An explicit mark wins (a `teacher_absent` mark beats a session that day).
2. Else a `class_sessions` row that PKT day → `present` (so history before this table still reads correctly, and a make-up class on an unscheduled day shows as present).
3. Else `unmarked` (a scheduled day with nothing recorded).

Scheduled days run from enrolment (`students.started_at`) to `ended_at` / today, inclusive (`scheduledDates()`). `summarizeAttendance()` counts each status plus `scheduled`.

## Where it's marked

* **Saving a class** (`handleEndSession` in `src/app/class/page.tsx`) upserts `present` for the session's PKT start date. Best-effort: an error (for example the migration isn't applied yet) is logged and the save continues.
* **Today's attendance** card on the `/class` landing, above the student picker (`ClassTodayAttendance`): students scheduled today (PKT weekday), ordered by class time (`compareByClassTime` in `src/lib/class-time.ts`, shared with the picker). Each row has the four statuses; clicking the active one clears it. **I'm absent today** / **Holiday today** mark every scheduled student who isn't already present (mark or session); **Clear day off** removes today's `teacher_absent` / `holiday` marks. Optimistic with rollback and a toast on error.
* **Student page → Sessions tab → Attendance pill** (`StudentAttendanceCalendar`): month calendar (prev/next, defaults to the current PKT month), summary counts, scheduled days emphasised, future days disabled. Tap a past day or today to set a status or clear it.

There is no separate route or sidebar link; per-student features live in the student page tabs.

## RLS

Standard blueprint ([RLS model](../architecture/rls-security-model.md)): teacher `FOR ALL TO authenticated` via `is_teacher()`, student `FOR SELECT TO authenticated` on `student_id = my_student_id()`. Students never write attendance.

## Wired

* The [monthly report](monthly-parent-report.md) and the student portal's **My class days** page (`/student/attendance`) both use `scheduledDates` + `buildAttendanceDays` on PKT dates. The kid page shows ✅ Came to class / ⭐ Extra class / 🌙 Missed this one / 🌙 No class yet / 🌿 Teacher's day off / 🎉 Holiday / ⏳ Coming up, and its "X / Y class days" uses `attendanceTotals` (teacher-absent and holiday days don't count). The old device-timezone `buildMonthAttendance` was removed.
* The student-portal **streak** (`computeStreak` in `src/lib/streak.ts`, used by `student-streak-card.tsx` and `/student/classes`) takes the marks: `teacher_absent` / `holiday` days are skipped like off days (never break the streak, shown as "off" in the week strip), a `present` mark counts like a session, and `student_absent` breaks it. Days are PKT.
