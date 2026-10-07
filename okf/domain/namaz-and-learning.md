---
type: domain-concept
title: "Namaz and Supplementary Islamic Learning"
description: "Open, unassigned step-by-step Namaz guide: steps, parts, Arabic and the student viewer. No badges or certificates."
status: stable
verified: true
sources:
  - "src/lib/namaz.ts"
  - "src/lib/namaz.test.ts"
  - "supabase/migration_namaz_steps.sql"
  - "supabase/migration_namaz_arabic.sql"
  - "supabase/migration_namaz_translation.sql"
  - "supabase/migration_namaz_open_access.sql"
  - "src/app/student/namaz/page.tsx"
  - "src/components/namaz-journey.tsx"
  - "src/components/namaz-part-panel.tsx"
  - "src/lib/namaz-progress.ts"
  - "supabase/migration_namaz_remove_badge.sql"
  - "supabase/migration_namaz_guidance.sql"
  - "supabase/migration_namaz_audio.sql"
  - "src/app/namaz/audio/page.tsx"
  - "src/components/namaz-audio-row.tsx"
tags:
  - domain
  - namaz
  - arabic
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
   * Guidance columns (`migration_namaz_guidance.sql`): `action_text` (kid instruction), `word_tr` (transliteration, **one entry per Arabic word**), `repeat_count` ("Say it 3 times"), `audio_url` + `word_timings` (teacher recording), `needs_review` + `review_note` (generated content awaiting approval; see [Namaz Content Review List](namaz-review-list.md)).
   * **Word chips never copy the Arabic.** `wordChips(arabic_text, word_tr)` in `src/lib/namaz.ts` splits the stored Arabic on spaces (an ayah marker `۝` rides on the word before it) and pairs each word with `word_tr[i]`; joining the chips gives back `arabic_text` exactly. If the counts disagree (a teacher edited the Arabic), it returns null and the UI shows plain Arabic.
4. **One continuous journey:** `flattenNamaz(steps, parts)` lists every part of every step in prayer order (a part-less step gets one screen), so Next crosses step boundaries. Deep links use `stepSlug(title)` (`second-sujood`) and a 1-based part: `findStop(stops, "ruku", 1)`.
5. **Open Student Access & Memorization Integration (`migration_namaz_open_access.sql`):**
   * Every student automatically has unlocked access to `/student/namaz` and all `namaz_steps` / `namaz_step_parts` via open authenticated `SELECT` RLS policies.
   * Memorization and revision of individual Namaz parts is managed through the unified **Memorization & Revision** module (`memorization_catalog` with `category = 'Namaz'`), replacing the legacy `student_namaz`, `student_namaz_steps`, and `student_namaz_parts` tables.

### Student guide (`/student/namaz`)
* **Grid** (`page.tsx`): **Continue** (last position) and **Start from the beginning**, and the 9 step cards with a Done tick once every part of the step was viewed. Learn mode only: there is no Pray Along or Challenge mode (dropped 2026-10-07).
* **Learn journey** (`namaz-journey.tsx`): the URL is the state, `?step=<slug>&part=<1-based>`. Opening from the grid **pushes** one history entry; Back/Next/segment taps **replace** it; "All steps" pops it (or replaces when the child arrived by deep link), so browser Back always returns to the grid. `?done=1` shows the "You learned the whole prayer!" screen (Start again / Back to steps). Next names its destination ("Next: Qawmah") and becomes Finish on Salam. Swipe left/right, ←/→ keys, Esc for the grid.
* **Layout:** normal page flow inside the student shell (no full-screen overlay, no nested scroll): progress bar (one tappable segment per step: sage done, accent current, grey upcoming), picture, title + "Say it N times", "What to do" box, word chips, meaning, audio controls, then a **sticky** Back/Next bar that sits above the phone tab bar (`bottom-[6.5rem]`, `lg:bottom-4`).
* **Part panel** (`namaz-part-panel.tsx`): Arabic shown as word chips (`wordChips`), transliteration under each word, RTL. With `audio_url`: Listen · Slow (0.75×) · ×N (`repeat_count`, 700 ms gap), karaoke highlight in `accent` from `word_timings` (even spread when missing), tap a word to hear just that word (only when timed). No audio → no controls.
* **Progress is local only** (`src/lib/namaz-progress.ts`, `localStorage`, keyed by student id): viewed screens (2 s on screen or audio finished) and the last position. Namaz is an open guide, so nothing is stored server-side.
### Teacher audio and review (`/namaz/audio`)
* Linked from the teacher Namaz page ("Audio & review"). Lists every part in prayer order with its Arabic, word chips and action text; a **Needs review** filter shows only `needs_review` parts, each with its `review_note` and an **Approve** button (clears both).
* **Record** (MediaRecorder; the microphone is only ever requested here, and middleware keeps students out of non-`/student` routes), **Re-record**, **Upload file** (mp3 / m4a / webm) and **Delete**. Clips go to the public `namaz-audio` bucket (`migration_namaz_audio.sql`: teacher-only write via `is_teacher()`, audio MIME types only, 10 MB). A new clip clears `word_timings` and removes the old file. `namazAudioType` / `namazAudioPath` in `src/lib/namaz.ts`.
* **Tap-to-time:** "Time the words" plays the clip; the teacher taps the button (or Space) at the start of each word. The draft is previewed with the real student panel (`NamazPartPanel`) before **Save timings**; **Reset timings** sets them back to null (students then get the even spread). `validWordTimings` guards the saved shape.

* **Images** read best as transparent PNGs, portrait ~3:4, one consistent style per posture. A white or cream background shows as a bright box on the dark theme.

---

## 🚫 No assignment, no awards

`/student/namaz` is a plain guide: any signed-in student opens it and reads. Nothing is assigned by the teacher, nothing is tracked per student, and nothing is awarded.

* The per-student tables (`student_namaz`, `student_namaz_steps`, `student_namaz_parts`) were dropped by `migration_namaz_open_access.sql`; their unlock/revision helpers are gone from `src/lib/namaz.ts`.
* The `namaz_complete` ("Namaz Master") badge and its certificate were removed (`migration_namaz_remove_badge.sql`, 2026-10-07). There is no `namaz` domain on the Trophies page.
