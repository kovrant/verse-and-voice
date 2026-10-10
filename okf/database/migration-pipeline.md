---
type: runbook
title: "Database Migration Pipeline and Execution Order"
description: "Sequential dependency chain for hand-applied Supabase SQL migration files."
status: stable
verified: true
sources:
  - "README.md"
  - "supabase/"
tags:
  - database
  - migrations
  - sql
  - pipeline
---

# Database Migration Pipeline and Execution Order

Migrations in Quran Academy are **hand-applied in the Supabase SQL Editor**. 

> [!CAUTION]
> The filenames are **not alphabetically ordered**. Running these files out of order will result in broken foreign key references and missing function errors.

---

## 📜 Canonical Execution Sequence

Execute the SQL files strictly in this order:

1. `schema.sql` — Baseline tables (`profiles`, `students`, initial `quran_rounds`, `fee_payments`).
2. `migration_student_para_progress.sql` — Creates `student_para_progress` (per-(student, para) last-read page) and adds `class_sessions.ending_page` / `last_page`. A no-op on a fresh build (`schema.sql` already has both); kept for databases created before them. Run **before** `migration_para_progress_rls.sql`. Idempotent.
3. `migration_bookmark.sql` — Adds bookmark columns (`last_line`, `last_pointer_x/y` on `student_para_progress`; `ending_line`, `ending_pointer_x/y` on `class_sessions`). Run **after** `migration_student_para_progress.sql`. Idempotent; on a fresh build the columns already exist, so its `CHECK (1..15)` line constraints are skipped.
4. `migration_student_device.sql` — Adds `students.last_device` / `last_device_at` for device tracking. Idempotent.
5. `migration_quran_progress.sql` — Quran progress tracking fields.
6. `migration_memorization.sql` — Hifz catalog and assignment foundation.
7. `setup_storage.sql` — Supabase storage buckets and permissions.
8. `migration_media_library.sql` — Media library table and metadata.
9. `migration_quran_rounds.sql` — Round numbering and dates.
10. `migration_auth_rls.sql` — Base RLS policies for auth tables.
11. `migration_class_sessions.sql` — Live class session records.
12. `migration_student_portal.sql` — Core student portal schema & `is_teacher()` / `my_student_id()` functions (*must come after `migration_auth_rls.sql`*).
13. `migration_realtime_class_auth.sql` — Realtime channel publication and security.
14. `migration_para_progress_rls.sql` — Policies for bookmark tracking.
15. `migration_activity_logs.sql` — Telemetry and portal activity logs.
16. `migration_islamic_history.sql` — Timeline cards and history events.
17. `migration_notifications.sql` — Notification table and indexes.
18. `migration_class_days.sql` — Day-of-week integer array for class schedules.
19. `migration_memorization_chunks.sql` — Breakdown of memorization lessons into chunks.
20. `migration_notifications_retention.sql` — Cleanup jobs for old notifications.
21. `migration_notifications_rls_fix.sql` — Corrected notification RLS checks.
22. `migration_qaida.sql` — Qaida media assignment on students.
23. `migration_qaida_live_class.sql` — **Never existed; skip (see note).** The Qaida live class was built in app code with no migration.
24. `migration_namaz_steps.sql` — Namaz steps and posture schema.
25. `migration_namaz_arabic.sql` — Adds `namaz_step_parts.arabic_text`, seeds the Arabic for the shipped parts and adds the Qawmah / Salam parts. Run **after** `migration_namaz_steps.sql`. Idempotent; never overwrites a teacher's edit.
26. `migration_namaz_realtime.sql` — Adds `student_namaz`, `student_namaz_steps`, `student_namaz_parts` to the `supabase_realtime` publication. Run **after** `migration_namaz_steps.sql`. Idempotent. **Obsolete:** `migration_namaz_open_access.sql` drops these tables.
27. `migration_achievements.sql` — Achievement seed badges.
28. `migration_achievements_module.sql` — Unified badges and certificates.
29. `migration_quizzes.sql` — Quiz module (`quizzes`, `quiz_questions`, `quiz_assignments`, `quiz_attempts`) with open policies, adds `quiz` to the achievement domain check, and seeds three starter quizzes. Run **after** `migration_achievements_module.sql`. **Not idempotent:** a re-run duplicates the seed quizzes and reopens the policies `migration_rls_hardening.sql` closes.
30. `migration_hadiths.sql` — Hadith module (`hadiths`, `student_hadith_progress`, `hadith_assignments`), RLS, 50 seed hadiths, and adds `hadith` to the achievement domain check. Run **after** `migration_quizzes.sql`. Idempotent, but a re-run overwrites edits to seeded hadiths and reopens the student write policy `migration_security_hardening.sql` removes.
31. `migration_memorization_revision.sql` — Revision queue and triggers.
32. `migration_rls_hardening.sql` — Drops the open (`public`) policies on storage, quizzes and `class_sessions`; storage writes and quiz management become teacher-only. Run **after** `migration_quizzes.sql`. Idempotent.
33. `migration_namaz_translation.sql` — Adds `namaz_step_parts.translation` and seeds English meanings. Run **after** `migration_namaz_arabic.sql`. Idempotent; never overwrites a teacher's edit. **Apply before deploying the code that selects the column.**
34. `migration_security_hardening.sql` — 6-Vector AppSec hardening: revokes `PUBLIC`/`anon` execute on `SECURITY DEFINER` helpers, enforces `login_disabled` inside `is_teacher()` and `my_student_id()`, removes student `FOR ALL` write access on `student_hadith_progress`, adds column-immutability `BEFORE UPDATE` triggers on `student_namaz_steps` and `notifications`, restricts student `SELECT` on `quizzes` and `quiz_questions` to `is_published = true`, and enforces a raster/PDF MIME whitelist (`allowed_mime_types`) and 50 MB `file_size_limit` on storage buckets. Idempotent.
35. `migration_namaz_open_access.sql` — Opens `namaz_steps` / `namaz_step_parts` read to every authenticated user and drops the per-student `student_namaz*` tables plus the `enforce_student_namaz_step_columns` trigger. Run **after** `migration_security_hardening.sql`. Idempotent.
36. `migration_ai_usage_logs.sql` — AI usage logging table (`ai_usage_logs`), token telemetry, indexes, and RLS policies for tracking Google Gemini API requests, prompt/completion tokens, and daily quota consumption. Idempotent.
37. `migration_islamic_history_v2.sql` — Islamic History V2 schema extensions (`topic_slug`, `quran_gem`, `life_lessons`, `quiz_id`, `hero_virtue`) and `student_story_progress` reading completion ledger. Idempotent.
38. `migration_namaz_remove_badge.sql` — Deletes the `namaz` achievement domain (`namaz_complete` definition plus any earned rows and certificates). Namaz is an open guide with no awards. Idempotent.
39. `migration_namaz_guidance.sql` — Adds `action_text`, `word_tr`, `repeat_count`, `audio_url`, `word_timings`, `needs_review`, `review_note` to `namaz_step_parts`, seeds them and fixes the "Rabbiyal" part titles. Never touches `arabic_text` / `translation`. Idempotent. **Apply before deploying the code that selects the columns** (`NAMAZ_PART_SELECT`).
40. `migration_namaz_audio.sql` — Creates the public `namaz-audio` storage bucket (audio MIME types, 10 MB) with teacher-only insert/update/delete. Run **after** `migration_namaz_guidance.sql`. Idempotent.
41. `migration_ai_usage_logs_rls_fix.sql` — Drops the open (`public`) `ai_usage_logs_select` / `ai_usage_logs_insert` policies and replaces them with a teacher-only `FOR ALL TO authenticated` policy. App access is service-role only. Run **after** `migration_ai_usage_logs.sql`. Idempotent.
42. `migration_para_progress_fixes.sql` — Re-adds `student_para_progress_bounds_check` as `para_number BETWEEN 0 AND 30` (Qaida sentinel), widens `student_para_progress_last_line_check` and `class_sessions_ending_line_check` to `1..16` (16-line mushaf), and adds `UNIQUE (student_id, para_number)` if missing. Run **after** `migration_security_hardening.sql` and `migration_bookmark.sql`. Idempotent.

> [!NOTE]
> * `migration_qaida_live_class.sql` is listed but has never been in git; skip it. The Qaida live class was built in app code with no migration (see `domain/qaida-curriculum.md`): it only needs `para_number = 0`, which `migration_security_hardening.sql` now allows (`0..30`), and step 42 fixes databases that ran the older `1..30` version.
> * `migration_quizzes.sql` and `migration_hadiths.sql` both drop and recreate `achievement_definitions_domain_check`, and the quizzes one omits `hadith`. Hadiths must run after quizzes, and both after `migration_achievements_module.sql` (which creates the table with a narrower check).
> * `migration_namaz_open_access.sql` drops the trigger `migration_security_hardening.sql` creates on `student_namaz_steps`. Run it before 34 and 34 fails on the missing table.
> * `migration_namaz_realtime.sql` and the `student_namaz*` half of `migration_namaz_steps.sql` are superseded by step 35 but kept so later files apply cleanly.
> * `student_para_progress` `UNIQUE(student_id, para_number)` is now declared in `schema.sql` and `migration_student_para_progress.sql` (fresh builds) and step 42 (existing DBs).
> * `README.md` links here instead of keeping its own run order; this file is the only list.

---

## 🛠️ Data-Only Scripts (Do Not Run As Schema)
* `backfill_old_fees_paid.sql`: One-time fee data repair.
* `backfill_notification_copy.sql`: One-time copy migration.
