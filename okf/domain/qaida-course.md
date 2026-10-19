---
type: domain-concept
title: "Qaida Course (card-based Noorani Qaida)"
description: "The ten-unit card course that replaces the Qaida PDF: content in code, stable card ids, teacher recordings keyed by audio key, per-student progress and unit checks."
status: draft
verified: true
sources:
  - "src/content/qaida/index.ts"
  - "src/content/qaida/types.ts"
  - "src/content/qaida/builders.ts"
  - "src/content/qaida/letters.ts"
  - "src/content/qaida/units/"
  - "src/content/qaida/qaida.test.ts"
  - "src/lib/qaida-course.ts"
  - "src/lib/qaida-course.test.ts"
  - "src/lib/use-audio-recorder.ts"
  - "src/lib/storage.ts"
  - "src/components/qaida-audio-row.tsx"
  - "src/components/qaida-card-tile.tsx"
  - "src/app/teacher/qaida/page.tsx"
  - "src/lib/qaida-live.ts"
  - "src/lib/qaida-live.test.ts"
  - "src/lib/use-qaida-audio.ts"
  - "src/lib/use-class-channel.ts"
  - "src/components/qaida-card-view.tsx"
  - "src/components/qaida-live-deck.tsx"
  - "src/components/live-session.tsx"
  - "src/components/student-live-class.tsx"
  - "src/components/live-class-provider.tsx"
  - "src/components/class-student-card.tsx"
  - "src/app/teacher/class/page.tsx"
  - "supabase/migration_qaida_course.sql"
  - "scripts/qaida-deck-json.mjs"
  - "qaida-draft/IMPLEMENTATION-PLAN.md"
tags:
  - domain
  - qaida
  - curriculum
  - audio
  - progress
---

# Qaida Course (card-based Noorani Qaida)

The Noorani Qaida is taught from **cards**, not from the scanned PDF. Ten units, each a sequence of
steps, each step a sequence of cards. The teacher drives the cards in the live class, the child
practises them alone, and progress is tracked per card. The PDF is being retired (plan §7, decision 5).

The build runs in phases; this document describes what exists. The full plan with the settled
decisions is `qaida-draft/IMPLEMENTATION-PLAN.md`. The older PDF-based behaviour is in
[Qaida Curriculum & Sentinel](qaida-curriculum.md); since phase 2 the live class renders cards instead.

---

## 📚 Content lives in code: `src/content/qaida`

* `QAIDA_DECK` / `QAIDA_UNITS` (`index.ts`): 10 units, 291 cards, 62 exercises, 102 words and ayat.
  Units: 1 letters by look-alike family → 2 vowels → 3 joining and first words → 4 tanween → 5 madd,
  standing marks, leen → 6 sukoon and qalqala → 7 shaddah and ghunna → 8 thick/thin, Ra, Lam of Allah →
  9 the reader's rules → 10 Al-Fatiha, Al-Ikhlas, An-Nas.
* Card types (`types.ts`): `rule · family · letter · syllable · drill · shapes · word · ayah · exercise ·
  check · celebrate`. Every unit ends with exactly one `check` then one `celebrate`
  (tested).
* **Card ids are stable slugs** `u<unit>.<kind>.<slug>` (`u3.word.kataba`, `u1.ex.spot.boat`,
  `u10.ayah.fatiha.1`). Progress and audio rows key on them, so they are never renumbered; new cards get
  new slugs. Letter keys are lowercase and unique: the heavy look-alikes are `hha ص=saad ض=daad ط=taa
  ظ=zaa` next to `ha` (ه) and `ta` (ت).
* Helpers (`index.ts`): `allCards`, `cardById`, `locateCard`, `adjacentCards` (crosses unit
  boundaries), `firstCard`, `unitIsUnlocked(n, passedUnits)` (unit 1 always; unit N after unit N-1's
  check passed), `unlockedCardIds`.
* English only. Pronunciation markers: `heavy` (the book's green, shown gold), `qalqala` (blue),
  `ghunna` (rose).
* `node scripts/qaida-deck-json.mjs` regenerates `qaida-draft/qaida-cards.json` for the review page
  through vite's `ssrLoadModule`; no extra dependency.

> ponytail: content in code; move cards into tables only if the teacher needs to edit text in the portal.

## 🔊 Audio is keyed by audio key, not card

Several cards play the same clip (the syllable card بَ, the fatha drill grid and the listen exercise all
play `syl/ba-a`), so recordings are one row per **audio key** in `qaida_audio`
(`audio_key text PK, audio_url, recorded_at`). `collectAudioKeys()` (`src/lib/qaida-course.ts`) walks the
deck and returns every key once with the Arabic and transliteration to show while recording, the first
unit that uses it and the cards that play it. Key groups by prefix: `letters/ · syl/ · words/ · quran/`.
Around 330 keys in total.

Clips go to the public **`qaida-audio`** bucket (teacher-only write, audio MIME types, 10 MB), named
`<key-with-dashes>-<timestamp>.<ext>` and never overwritten (`qaidaAudioObjectName`), cached forever
(`CACHE_FOREVER`). Saving a new clip upserts the row, then removes the old object.

`audioUploadType` and `bucketObjectPath` in `src/lib/storage.ts` are shared with Namaz
(`namazAudioType` / `namazAudioPath` are thin wrappers). `useAudioRecorder` (`src/lib/use-audio-recorder.ts`)
is the MediaRecorder hook; `namaz-audio-row.tsx` still has its own copy.

## 🧑‍🏫 Teacher: `/teacher/qaida`

Replaces the old Qaida PDF list (PDFs remain in the Media Library).
* **Course** tab: units as an accordion (one open), each with its goal, "why this shape", steps and
  compact card tiles (`QaidaCardTile`). A card with audio shows **audio** (all its clips recorded) or
  **record** (jumps to the Recording tab focused on its first missing clip).
* **Recording** tab: the audio keys filtered by unit (default Unit 1), group and "Missing only", with
  `QaidaAudioRow` per key: Record / Upload / Delete and a player. **Record next missing** focuses the
  first unrecorded key; after a save the focus moves to the next missing one, so the teacher can record
  a unit in one sitting. Header shows "N of M clips recorded".
* Decision 3 in the plan: the teacher's voice, Units 1 and 2 first (about 110 clips); a card without
  a clip hides its speaker button on the child's side (phase 2).

## 🎓 Live class (phase 2)

A Qaida round (para `0`) teaches the course; no PDF is needed to start (`qaidaMissing` is always false).
* **Start:** the class page reads `students.qaida_card_id` in its own query (so a database without the
  column still lists students) and `startingCard()` falls back to the first card.
* **Teacher (`QaidaLiveDeck` inside `live-session.tsx`):** the card as the child sees it plus teacher
  notes and exercise answers; Prev / Next (also ← →); **Play** (plays locally and broadcasts `play`);
  **Hide / Show hint**; tap any tile to highlight it on both screens; **Needs work** / **Mastered**
  upsert `student_qaida_progress` immediately; a course tree on the right jumps to any card and shows
  each card's mark. Showing a card upserts `seen` with `ignoreDuplicates`, so it never downgrades a
  mark. The Tajweed deck starts closed for Qaida.
* **Child (`student-live-class.tsx`):** on para `0` with a `cardId` it renders `QaidaCardView` in the
  kid frame and follows the teacher's card, hint and highlight (held in `LiveClassProvider` so a
  late-mounting viewer still gets them), and plays the clip on `play`. Tapping a tile with its own clip
  plays it. Speaker buttons hide when no clip is recorded.
* **Tiles:** `cardTiles(card)`: family members, drill items, the four shapes, exercise items, or the
  card's Arabic split on spaces (never inside a word, Arabic must stay joined).
* **End:** `class_sessions.ending_card_id`, `ending_page = cardPage(card)` (1-based course position),
  `students.qaida_card_id` updated best-effort, no PDF bookmark. The class card's "Currently On" reads
  `Norani Qaida · Unit 3 · Letters hold hands · card 14 of 32` (`qaidaCardLabel`).
* **Exercises** are shown but run out loud in phase 2: the teacher points at items; live answers,
  scoring and confetti arrive in phase 3.

## 🗄️ Database (`migration_qaida_course.sql`)

| Table / column | Purpose | Writes |
|---|---|---|
| `qaida_audio` | One recording per audio key. | Teacher; students `SELECT` |
| `student_qaida_progress` (`student_id, card_id, status, attempts, correct, last_seen_at, mastered_at`, `UNIQUE(student_id, card_id)`) | Per-card mastery. `status ∈ seen · practising · mastered · needs_work`. | Teacher full. Child inserts/updates own rows but only `seen`/`practising` and the counters: `WITH CHECK` on insert, and the `BEFORE UPDATE` trigger `enforce_student_qaida_progress_columns` snaps everything else back to `OLD` for non-teachers (same BOPLA pattern as `notifications`). |
| `student_qaida_checks` (`unit 1..10, score, total, passed, note, checked_at`) | One row per unit check attempt; the latest `passed` unlocks the next unit. | Teacher; students `SELECT` own |
| `students.qaida_card_id` | Where the child is. Null = start of Unit 1. | Teacher (live class saves it, phase 2) |
| `class_sessions.ending_card_id` | What a Qaida class ended on, next to `ending_para = 0`. | Teacher (phase 2) |
| `achievement_definitions` `qaida_unit_01 … qaida_unit_10` | Unit badges (domain `qaida`). `qaida_complete` already exists for Unit 10. | Migration seed |

Para 0 keeps meaning "the Qaida" in `class_sessions`, rounds and the monthly report; only what para 0
renders changes (phase 2).

## 🚧 Phases

| Phase | State |
|---|---|
| 0 content module | done 2026-10-19 |
| 1 migration, bucket, teacher course page with recording | done 2026-10-19 (migration file written; apply in the SQL editor) |
| 2 live deck (teacher + child), `nav.cardId`, `qaida` broadcast event | done 2026-10-19 |
| 3 exercises live, unit check scoreboard, badges, confetti | next |
| 4 child's course home and self-practice, teacher Qaida tab, dashboard, monthly report | |
| 5 retire the PDF path | |
