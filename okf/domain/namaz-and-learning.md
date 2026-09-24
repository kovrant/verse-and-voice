---
type: domain-concept
title: "Namaz and Supplementary Islamic Learning"
description: "Step-by-step Namaz learning pipeline, revision states, Arabic recitation normalization, and achievements."
status: stable
verified: true
sources:
  - "src/lib/namaz.ts"
  - "src/lib/namaz.test.ts"
  - "supabase/migration_namaz_steps.sql"
  - "supabase/migration_namaz_arabic.sql"
  - "supabase/migration_achievements_module.sql"
tags:
  - domain
  - namaz
  - arabic
  - achievements
---

# Namaz and Supplementary Islamic Learning

The Namaz module teaches children prayer postures, steps (Takbeer, Qiyam, Ruku, Sujood, Tashahhud, Salam), and associated Arabic recitations.

---

## 🕌 Hierarchical Step Architecture

1. **`namaz_steps`:** Core prayer postures with ordered sequence (`order_index`), custom card colors (`NAMAZ_CARD_COLORS`), and posture illustration images.
2. **`namaz_step_parts`:** Sub-phrases or specific recitations within a prayer step (e.g., Sana, Surah Fatiha, Tashahhud, Durood-e-Ibrahim).
   * Stores `arabic_text`: Teacher-editable Arabic text for the child to recite.
3. **Student Progress Records:**
   * `student_namaz`: High-level enrollment status (`"learning"` | `"completed"`).
   * `student_namaz_steps`: Step-level unlocking (`unlocked_at`), completion (`completed_at`), and revision queue timestamps (`revision_assigned_at`).
   * `student_namaz_parts`: Part-level revision tracking.

---

## 🔒 Step Unlocking & Revision Lifecycle

* **Learning Phase:** A step is interactive if `unlocked_at` is set. Unlocked steps stay open even after being marked complete so students can review earlier postures.
* **Completed Module Revision Phase:** Once the module status is `"completed"`, steps lock down to focus the student solely on parts flagged for revision (`revision_assigned_at`).

---

## 🏆 Unified Achievements & Certificates

* **Schema:** `achievements` and `student_achievements` (unified via `migration_achievements_module.sql`).
* **Milestones:**
  * Qaida completion.
  * Namaz master badge (`namaz_complete`).
  * Para milestones (e.g., 5, 10, 15, 20, 25 Paras).
  * Half-Quran & Complete Quran Khatm.
* **Certificate Generation:** Allows downloadable completion certificates linked to student achievement rows.
