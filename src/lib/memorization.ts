// Pure memorization-chunk helpers (no Supabase import) so they're unit-testable
// without env/config. Data-loading lives in components/memorization-chunks.tsx.

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
