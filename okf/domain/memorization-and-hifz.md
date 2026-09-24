---
type: domain-concept
title: "Memorization (Hifz) and Revision Lifecycle"
description: "Chunked Hifz syllabus management, progress tracking, revision scheduling, and celebration states."
status: stable
verified: true
sources:
  - "src/lib/memorization.ts"
  - "src/lib/memorization.test.ts"
  - "supabase/migration_memorization.sql"
  - "supabase/migration_memorization_chunks.sql"
  - "supabase/migration_memorization_revision.sql"
tags:
  - domain
  - memorization
  - hifz
  - revision
  - chunks
---

# Memorization (Hifz) and Revision Lifecycle

Quran Academy provides a structured memorization pipeline allowing students to memorize Surahs, Duas, and selected passages divided into manageable chunks.

---

## 🧩 The Catalog and Chunk Model

1. **`memorization_catalog`:** The global master library of lessons (Surahs, Kalimas, Namaz Duas).
2. **`memorization_chunks`:** Subdivided lesson parts (e.g., Ayahs or sentences within a Surah).
   * Supports custom labels (e.g., `"Ayah 1–5"`) falling back to auto-numbered `"Part N"`.
   * Holds `order_index` and individual part images.
3. **`student_memorization`:** Associates a catalog item with a student.
   * `status`: `"memorizing"` | `"memorized"`.
   * `last_revised_at`: Timestamp of most recent revision.
   * `revision_assigned_at`: Timestamp when the teacher queued this item into the student's active revision bucket.
4. **`student_memorization_chunks`:** Records individual chunks marked as completed by the student.

---

## ⚙️ Completion Triggers & Progress

* **Database Trigger Rule:** A lesson (`student_memorization`) is automatically marked as `"memorized"` if and only if **all** of its chunks in `memorization_chunks` have been marked as completed in `student_memorization_chunks`.
* **Current Lesson Target (`currentChunkIndex`):** Evaluates the first unmemorized chunk index. Returns `-1` if all are complete or if no chunks exist.

```typescript
// src/lib/memorization.ts
export function chunkProgress(
  chunks: MemChunk[],
  memorizedIds: Set<string>,
): { done: number; total: number; isMemorized: boolean } {
  const total = chunks.length
  const done = chunks.filter((c) => memorizedIds.has(c.id)).length
  return { done, total, isMemorized: total > 0 && done === total }
}
```

---

## 🎉 Celebration Mechanics (`CelebratedState`)

Because chunk and lesson completions are confirmed by the teacher during or after class, students might earn an achievement while offline:
* **Persistence:** Tracked per-student in `localStorage` under `mem-celebrated-<studentId>`.
* **First-Visit Baseline:** If `seen` is null (first visit), existing items are treated as historical baselines to prevent an avalanche of historical popups.
* **Swallowing Rule:** When the final chunk of a lesson is completed, the celebratory modal elevates to a "Lesson Complete" celebration rather than firing a redundant "Part N Done" celebration.
