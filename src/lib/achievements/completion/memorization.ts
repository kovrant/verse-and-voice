import { chunkProgress, labelFor, type MemChunk } from "@/lib/memorization"

export { chunkProgress, labelFor }
export type { MemChunk }

export function isLessonMemorized(chunks: MemChunk[], memorizedIds: Set<string>): boolean {
  return chunkProgress(chunks, memorizedIds).isMemorized
}

export function isDirectLessonMemorized(
  status: "memorizing" | "memorized",
  chunkCount: number,
): boolean {
  return chunkCount === 0 && status === "memorized"
}
