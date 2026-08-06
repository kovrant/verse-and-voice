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
export const MEM_ITEM_SELECT = `id, status, last_revised_at, ${CATALOG_SELECT}`

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
