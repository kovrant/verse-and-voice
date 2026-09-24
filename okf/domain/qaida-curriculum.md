---
type: domain-concept
title: "Qaida Curriculum and Sentinel Mapping"
description: "Handling foundational beginner reading (Qaida), the sentinel para_number=0 pattern, and media library linking."
status: stable
verified: true
sources:
  - "src/lib/qaida.ts"
  - "src/lib/para-progress.ts"
  - "supabase/migration_qaida.sql"
  - "src/components/student-qaida-assign.tsx"
tags:
  - domain
  - qaida
  - curriculum
  - sentinel
---

# Qaida Curriculum and Sentinel Mapping

Beginner students start their studies on **Norani Qaida** before advancing to the 30 Paras of the Holy Quran.

---

## 🛑 The Sentinel Invariant: `para_number = 0`

Quran paras are numbered **1 through 30**. 

To reuse the existing realtime classroom, bookmarking, and progress persistence infrastructure without creating duplicate parallel systems, **Qaida is represented by the sentinel value `0`**.

```typescript
// Sentinel Convention:
// Para 0  => Assigned Qaida PDF from media_library
// Para 1–30 => Quran Paras 1 to 30
```

### ⚠️ Critical Constraints Across the Stack
1. **Realtime Broadcasts:** When teaching Qaida, the `nav` event carries `{ para: 0, page: n }`.
2. **Bookmarking & Progress:** `student_para_progress.para_number = 0` stores the student's bookmark inside their assigned Qaida book.
3. **Database Constraints:** Any database check or trigger on `para_number` must permit `0` (e.g., `CHECK (para_number BETWEEN 0 AND 30)`), never `CHECK (para_number BETWEEN 1 AND 30)`.
4. **UI Displays:** Any component rendering `"Para N"` must check for `0` and render `"Norani Qaida"` instead.

---

## 📖 Media Library Association

* **Assignment Column:** `students.qaida_media_id` (foreign key to `media_library.id`).
* **Media Type:** Added via `migration_qaida.sql` with `CHECK (type IN ('quran', 'memorization', 'general', 'qaida'))`.
* **Resolution (`src/lib/qaida.ts`):**
  ```typescript
  export function resolveAssignedQaida<T extends { id: string }>(
    items: T[],
    qaidaMediaId: string | null | undefined,
  ): T | null {
    if (!qaidaMediaId) return null
    return items.find((item) => item.id === qaidaMediaId) ?? null
  }
  ```
* If `qaida_media_id` is null or the media file is deleted (`ON DELETE SET NULL`), the student's Qaida view gracefully reports no material assigned.
