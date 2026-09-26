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
2. `migration_quran_progress.sql` — Quran progress tracking fields.
3. `migration_memorization.sql` — Hifz catalog and assignment foundation.
4. `setup_storage.sql` — Supabase storage buckets and permissions.
5. `migration_media_library.sql` — Media library table and metadata.
6. `migration_quran_rounds.sql` — Round numbering and dates.
7. `migration_auth_rls.sql` — Base RLS policies for auth tables.
8. `migration_class_sessions.sql` — Live class session records.
9. `migration_student_portal.sql` — Core student portal schema & `is_teacher()` / `my_student_id()` functions (*must come after `migration_auth_rls.sql`*).
10. `migration_realtime_class_auth.sql` — Realtime channel publication and security.
11. `migration_para_progress_rls.sql` — Policies for bookmark tracking.
12. `migration_activity_logs.sql` — Telemetry and portal activity logs.
13. `migration_islamic_history.sql` — Timeline cards and history events.
14. `migration_notifications.sql` — Notification table and indexes.
15. `migration_class_days.sql` — Day-of-week integer array for class schedules.
16. `migration_memorization_chunks.sql` — Breakdown of memorization lessons into chunks.
17. `migration_notifications_retention.sql` — Cleanup jobs for old notifications.
18. `migration_notifications_rls_fix.sql` — Corrected notification RLS checks.
19. `migration_qaida.sql` — Qaida media assignment on students.
20. `migration_qaida_live_class.sql` — Supports sentinel `para_number = 0`.
21. `migration_namaz_steps.sql` — Namaz steps and posture schema.
22. `migration_achievements.sql` — Achievement seed badges.
23. `migration_achievements_module.sql` — Unified badges and certificates.
24. `migration_memorization_revision.sql` — Revision queue and triggers.
25. `migration_rls_hardening.sql` — Drops the open (`public`) policies on storage, quizzes and `class_sessions`; storage writes and quiz management become teacher-only. Run **after** `migration_quizzes.sql`. Idempotent.

---

## 🛠️ Data-Only Scripts (Do Not Run As Schema)
* `backfill_old_fees_paid.sql`: One-time fee data repair.
* `backfill_notification_copy.sql`: One-time copy migration.
