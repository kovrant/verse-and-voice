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
  - "supabase/migration_namaz_translation.sql"
  - "supabase/migration_namaz_open_access.sql"
  - "src/components/namaz-step-viewer.tsx"
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
   * Stores `translation`: its meaning in English, shown under the Arabic. Seeded for the parts that ship with the app by `migration_namaz_translation.sql`, which only fills empty values.
   * Image: a part's own `image_url` if set, otherwise the step's.
3. **Open Student Access & Memorization Integration (`migration_namaz_open_access.sql`):**
   * Every student automatically has unlocked access to `/student/namaz` and all `namaz_steps` / `namaz_step_parts` via open authenticated `SELECT` RLS policies.
   * Memorization and revision of individual Namaz parts is managed through the unified **Memorization & Revision** module (`memorization_catalog` with `category = 'Namaz'`), replacing the legacy `student_namaz`, `student_namaz_steps`, and `student_namaz_parts` tables.

### Student step viewer (`src/components/namaz-step-viewer.tsx`)
* **One part per screen**, with Back / Next, "2 of 5" and arrow-key support. A child learning to recite does better with one thing in view than a scroll of every part.
* **Desktop / tablet:** the words in a panel on the left, the posture picture full-height on the right. **Phone:** picture on top, words below.
* **Arabic is the hero:** Scheherazade Bold, sized by text length (`arabicSize()`) so *Allahu Akbar* fills the panel while Al-Fatiha or Durood still fit without scrolling. The English translation sits under it; the part title stays as a small pronunciation hint.
* **Images** read best as transparent PNGs, portrait ~3:4, one consistent style per posture (generated in Canva). A white or cream background shows as a bright box on the dark theme.

---

## 🏆 Unified Achievements & Certificates

* **Schema:** `achievements` and `student_achievements` (unified via `migration_achievements_module.sql`).
* **Milestones:**
  * Qaida completion.
  * Namaz master badge (`namaz_complete`).
  * Para milestones (e.g., 5, 10, 15, 20, 25 Paras).
  * Half-Quran & Complete Quran Khatm.
* **Certificate Generation:** Allows downloadable completion certificates linked to student achievement rows.
