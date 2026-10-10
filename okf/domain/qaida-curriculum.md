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
  - "src/app/class/page.tsx"
  - "src/components/class-student-card.tsx"
  - "src/components/live-session.tsx"
  - "src/components/student-live-class.tsx"
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
3. **Database Constraints:** Any database check or trigger on `para_number` must permit `0` (e.g., `CHECK (para_number BETWEEN 0 AND 30)`), never `CHECK (para_number BETWEEN 1 AND 30)`. `student_para_progress_bounds_check` (`migration_security_hardening.sql`) violated this until `migration_para_progress_fixes.sql`, so Qaida bookmarks silently fell back to `localStorage`.
4. **UI Displays:** Any component rendering `"Para N"` must check for `0` and render `"Norani Qaida"` instead. Use `paraLabel(n)` from `src/lib/qaida.ts` (`QAIDA_PARA = 0`). Session summaries (`paraSummary` in `student-session-bits.tsx`) and the session-ended notifications (`src/lib/notify.ts`) already do.
5. **Never test the para number for truthiness.** `0` is falsy: write `para != null` or `para === QAIDA_PARA`, never `if (para && …)`.

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

---

## 🎓 Qaida in the Live Class

Built entirely in app code on the sentinel; there is no migration (`student_para_progress.para_number` and `class_sessions.ending_para` already allow `0`).

* **Teacher (`src/app/class/page.tsx`):** loads `students.qaida_media_id` with the student list. On selection it fetches that `media_library` row and resolves it with `resolveAssignedQaida`. If the active round is `type = 'qaida'`, the book is injected into the `paras` passed to `LiveSession` with `meta.para_number = 0`, and the class opens on para 0.
* **No book assigned:** a Qaida-round student with no `qaida_media_id` (or a deleted book) gets a disabled **Start Class** and a hint linking to the student page to assign one. It never falls back to Quran Para 1.
* **Position (`classPosition()` in `class-student-card.tsx`):** for a Qaida round, para is always `0`, with page/line from the latest session whose `ending_para = 0` (else null). Quran rounds are unchanged. Covered by `class-student-card.test.ts`.
* **Class card:** "Currently On" reads `Norani Qaida · Page N`; the Quran `/30` progress bar is replaced by a one-line Qaida note. The history timeline is unchanged.
* **Live session (`live-session.tsx`):** on para 0 the prev/next para controls are hidden (page navigation only), "Advance to Para" is hidden, nearby-para PDF prefetch is skipped, and labels read "Norani Qaida". Ending the class saves `ending_para = 0` and the para-0 bookmark (`handleEndSession` checks `endingPara != null`). The round auto-advance stays limited to `1..30`, so a Qaida class never writes `quran_rounds.asc_completed`.
* **Student (`student-live-class.tsx`):** resolves the student's own `qaida_media_id` book (RLS: "Student read own record" on `students`, "Student read media" on `media_library`, both in `migration_student_portal.sql`) and maps it to para 0, so a `nav` broadcast with `paraNumber: 0` shows the Qaida. Labels read "Norani Qaida".
* The realtime protocol, PDF rendering and the line pointer are the same as for Quran paras.
