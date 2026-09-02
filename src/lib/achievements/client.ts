import { supabase } from "@/lib/supabase"
import type { MemChunk } from "@/lib/memorization"

import {
  syncMemorizationChunk,
  syncMemorizationLesson,
  syncNamazComplete,
  syncQuranRound,
} from "./sync"
import type { QuranRoundProgress, QuranRoundRef } from "./types"

export type RoundProgress = QuranRoundProgress
export type RoundRef = QuranRoundRef

export async function syncQuranRoundAchievements(
  studentId: string,
  round: QuranRoundRef,
  before: QuranRoundProgress,
  after: QuranRoundProgress,
): Promise<void> {
  return syncQuranRound(supabase, studentId, round, before, after)
}

export async function syncMemChunkAchievements(
  studentId: string,
  chunk: MemChunk,
  chunkIndex: number,
  lessonTitle: string,
  allChunks: MemChunk[],
  memorizedIds: Set<string>,
): Promise<void> {
  return syncMemorizationChunk(
    supabase,
    studentId,
    chunk,
    chunkIndex,
    lessonTitle,
    allChunks,
    memorizedIds,
  )
}

export async function awardMemLesson(
  studentId: string,
  catalogId: string,
  lessonTitle: string,
): Promise<void> {
  return syncMemorizationLesson(supabase, studentId, catalogId, lessonTitle)
}

export async function awardNamazCompleteBadge(studentId: string): Promise<boolean> {
  await syncNamazComplete(supabase, studentId)
  return true
}
