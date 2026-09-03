// Pure memorization types and chunk helpers (no Supabase import) so they're
// unit-testable without env/config. Data-loading lives in
// components/memorization-chunks.tsx.

// ── Catalog + assignment shapes ──────────────────────────────────────────────
// These were copy-pasted into five pages. The copies were still identical, but
// the select strings feeding them lived in those same files and had to be kept
// in sync by hand, so the selects live here next to the types they produce.

/** A catalog entry as embedded in a student's assignment row. */
export interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

/**
 * The embedded-catalog select. Kept beside CatalogItem so the two can't drift —
 * a field added to the interface but not to this string types a column that
 * PostgREST never returns.
 */
export const CATALOG_SELECT = "memorization_catalog(id, title, category, image_url)"

/** One catalog item assigned to a student (a `student_memorization` row). */
export interface StudentMemItem {
  id: string
  catalog_id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  revision_assigned_at: string | null
  memorization_catalog: CatalogItem
}

/** Select for a full StudentMemItem — `*` is what supplies catalog_id. */
export const STUDENT_MEM_SELECT = `*, ${CATALOG_SELECT}`

/**
 * The live-class shape: the same row minus catalog_id, which the class queries
 * don't select because nothing in the session needs it.
 */
export type MemItem = Omit<StudentMemItem, "catalog_id">

/** Select for a MemItem — mirrors the Omit above, so the type matches the row. */
export const MEM_ITEM_SELECT = `id, status, last_revised_at, revision_assigned_at, ${CATALOG_SELECT}`

// ── Chunk helpers ────────────────────────────────────────────────────────────

export interface MemChunk {
  id: string
  catalog_id: string
  order_index: number
  label: string | null
  image_url: string
}

/** Auto-numbered display label ("Part 1"), unless the teacher set a custom one. */
export function labelFor(chunk: MemChunk, index: number): string {
  const custom = chunk.label?.trim()
  return custom || `Part ${index + 1}`
}

/**
 * Chunk progress for an item. `isMemorized` mirrors the DB trigger's rule: an
 * item counts as fully memorized only when it has parts AND every one is done.
 */
export function chunkProgress(
  chunks: MemChunk[],
  memorizedIds: Set<string>,
): { done: number; total: number; isMemorized: boolean } {
  const total = chunks.length
  const done = chunks.filter((c) => memorizedIds.has(c.id)).length
  return { done, total, isMemorized: total > 0 && done === total }
}

/**
 * Index of the first unmemorized chunk (today's lesson). Returns -1 when there
 * are no parts, or when every part is already memorized.
 */
export function currentChunkIndex(chunks: MemChunk[], memorizedIds: Set<string>): number {
  if (chunks.length === 0) return -1
  return chunks.findIndex((c) => !memorizedIds.has(c.id))
}

// ── Achievement celebrations ─────────────────────────────────────────────────
// Parts are marked by the teacher, so a win can land while the student isn't
// looking — or between visits. We keep a record of what's already been
// celebrated per student, so the moment survives a missed realtime event
// without ever firing twice.

/** What this student has already been shown a celebration for. */
export interface CelebratedState {
  chunkIds: string[]
  lessonIds: string[]
}

export function celebrationStorageKey(studentId: string): string {
  return `mem-celebrated-${studentId}`
}

/** A memorized part, with the lesson it belongs to. */
export interface MemorizedChunkRef {
  chunkId: string
  catalogId: string
}

/**
 * Achievements earned since this student last saw one.
 *
 * `seen` is null only on a student's very first visit — everything already
 * memorized by then is history, not something to throw confetti at, so nothing
 * is returned and the current state is simply recorded as the baseline.
 *
 * A finished lesson swallows the part that finished it: earning the last part
 * of Ayat al-Kursi should show one big "lesson complete", not that plus a
 * smaller "part 18 done" for the same moment.
 *
 * `next` records only what is currently true, so a part the teacher undoes
 * drops out of the record and can be celebrated again when it's re-earned.
 */
export function pendingCelebrations(
  memorized: MemorizedChunkRef[],
  completedLessonIds: string[],
  seen: CelebratedState | null,
): { chunkIds: string[]; lessonIds: string[]; next: CelebratedState } {
  const next: CelebratedState = {
    chunkIds: memorized.map((m) => m.chunkId),
    lessonIds: [...completedLessonIds],
  }
  if (!seen) return { chunkIds: [], lessonIds: [], next }

  const seenChunks = new Set(seen.chunkIds)
  const seenLessons = new Set(seen.lessonIds)
  const newLessons = completedLessonIds.filter((id) => !seenLessons.has(id))
  const newLessonSet = new Set(newLessons)

  return {
    chunkIds: memorized
      .filter((m) => !seenChunks.has(m.chunkId) && !newLessonSet.has(m.catalogId))
      .map((m) => m.chunkId),
    lessonIds: newLessons,
    next,
  }
}
