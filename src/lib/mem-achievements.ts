import { awardBadge, ensureBadge } from "@/lib/badges"
import { chunkProgress, labelFor, type MemChunk } from "@/lib/memorization"

function memPartSlug(chunkId: string): string {
  return `mem_part_${chunkId}`
}

function memLessonSlug(catalogId: string): string {
  return `mem_lesson_${catalogId}`
}

/** Persist a part memorized. Badges are not revoked on undo. */
async function awardMemPart(
  studentId: string,
  chunk: MemChunk,
  chunkIndex: number,
  lessonTitle: string,
): Promise<void> {
  const partLabel = labelFor(chunk, chunkIndex)
  const slug = memPartSlug(chunk.id)
  await ensureBadge(slug, `${partLabel} · ${lessonTitle}`, `Memorized ${partLabel} of ${lessonTitle}`)
  await awardBadge(studentId, slug, `chunk:${chunk.id}`)
}

export async function awardMemLesson(
  studentId: string,
  catalogId: string,
  lessonTitle: string,
): Promise<void> {
  const slug = memLessonSlug(catalogId)
  await ensureBadge(slug, lessonTitle, `Memorized ${lessonTitle}`)
  await awardBadge(studentId, slug, `catalog:${catalogId}`)
}

/** Call after a chunk is marked memorized (teacher action). */
export async function syncMemChunkAchievements(
  studentId: string,
  chunk: MemChunk,
  chunkIndex: number,
  lessonTitle: string,
  allChunks: MemChunk[],
  memorizedIds: Set<string>,
): Promise<void> {
  try {
    await awardMemPart(studentId, chunk, chunkIndex, lessonTitle)
    if (chunkProgress(allChunks, memorizedIds).isMemorized) {
      await awardMemLesson(studentId, chunk.catalog_id, lessonTitle)
    }
  } catch {
    // ponytail: best-effort alongside the chunk write
  }
}
