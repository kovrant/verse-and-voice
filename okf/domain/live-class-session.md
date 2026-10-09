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
   * Records curriculum span: `starting_para`, `starting_page`, `ending_para`, `ending_page`, `last_page`.
   * Captures performance metrics: `status` (Present/Absent/Late), `rating` (1–5 stars), and teacher notes.
