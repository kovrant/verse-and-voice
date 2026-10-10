---
type: domain-concept
title: "Live Interactive Class Session"
description: "Realtime teacher-student classroom session, 16-line Mushaf pointer estimation, and session lifecycle."
status: stable
verified: true
sources:
  - "src/lib/use-class-channel.ts"
  - "src/lib/mushaf-pointer.ts"
  - "src/lib/para-progress.ts"
  - "src/app/class/page.tsx"
  - "src/components/live-session.tsx"
  - "src/components/class-student-card.tsx"
  - "src/components/student-live-class.tsx"
tags:
  - domain
  - live-class
  - mushaf
  - pointer
  - session
---

# Live Interactive Class Session

The Live Interactive Class is the core teaching module where a teacher conducts real-time 1-on-1 Quran and Qaida lessons with synchronized PDF navigation, line pointing, and session logging.

---

## 📚 What the Class Teaches: Quran Para or Qaida

The class page picks the starting position with `classPosition()` (`src/components/class-student-card.tsx`):
* **Quran round:** the latest session's `ending_para` (if `1..30`), else the active round's `asc_completed || 1`. Prev/Next para buttons switch between paras `1..30`.
* **Qaida round:** always para `0`, the student's assigned Qaida book (`students.qaida_media_id`), injected into the para list as `meta.para_number = 0`. Page/line come from the latest session with `ending_para = 0`. Para switching is hidden; only pages turn. With no book assigned, Start Class is disabled. Full details: [Qaida Curriculum](qaida-curriculum.md#-qaida-in-the-live-class).

## 🎯 Pointer & 16-Line Mushaf Calibration

All 30 para PDFs the teacher uses are the same **16-line layout** (`DEFAULT_MUSHAF_LINES = 16`). There is no per-book setting.

When a teacher taps or clicks the screen:
* The client records relative coordinates $(X, Y)$ normalized from `0.0` to `1.0`.
* The line index is mathematically calculated using `calculateMushafLine` (`src/lib/mushaf-pointer.ts`):
  * **Top Decorative Header Band:** Compensated by `DEFAULT_TOP_MARGIN_RATIO = 0.075` (~7.5%).
  * **Bottom Footer Band:** Compensated by `DEFAULT_BOTTOM_MARGIN_RATIO = 0.055` (~5.5%).
  * The remaining vertical space is divided into 16 equal line buckets.
  * The two margin ratios were tuned for a 15-line print and have not been re-measured against the 16-line PDFs.
  * The DB checks `student_para_progress_last_line_check` and `class_sessions_ending_line_check` allow `1..16` (`migration_para_progress_fixes.sql`).

```typescript
// Line bounds for highlighter overlay
const { topPercent, heightPercent } = calculateLineBounds(line)
```

---

## 💾 Page Position & Debounced Bookmarking

During class, the active page and bookmark coordinates are persisted via `src/lib/para-progress.ts`:
* Updates are written to the database table `student_para_progress`.
* Write calls are debounced to avoid overwhelming the database while flipping pages.
* Failures (such as transient network disconnects) are silently caught and cached in `localStorage` (`quran_academy_bm_<studentId>_p<paraNumber>`) as fallback.

---

## ⏱️ Class Session Lifecycle & Database Writes

When a teacher completes and saves a class session:
1. **Duration:** Formatted via `formatSessionDuration(seconds)` (`src/lib/utils.ts`).
2. **Session Row (`class_sessions`):**
   * Stores `student_id`, `started_at` (timestamptz), `ended_at`, `duration_seconds`.
   * Records curriculum span: `starting_para`, `starting_page`, `ending_para`, `ending_page`, `last_page`. A Qaida class stores `0`.
   * Captures performance metrics: `status` (Present/Absent/Late), `rating` (1–5 stars), and teacher notes.
3. **Bookmark:** the ending position is saved to `student_para_progress` for the ending para (`endingPara != null`, so Qaida's `0` is included).
4. **Round auto-advance:** `quran_rounds.asc_completed` is raised only for an ending para in `1..30`; Qaida classes never touch it.
