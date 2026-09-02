import type { SupabaseClient } from "@supabase/supabase-js"

import { labelFor, STUDENT_MEM_SELECT, type MemChunk, type StudentMemItem } from "@/lib/memorization"

import {
  syncMemorizationChunk,
  syncMemorizationLesson,
  syncNamazComplete,
  ensureQuranRoundAchievements,
} from "./sync"
import type { QuranRoundProgress, QuranRoundRef } from "./types"

async function countAchievements(db: SupabaseClient, studentId: string): Promise<number> {
  const { count } = await db
    .from("student_achievements")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
  return count ?? 0
}

async function loadChunksByCatalog(
  db: SupabaseClient,
  catalogIds: string[],
): Promise<Record<string, MemChunk[]>> {
  if (catalogIds.length === 0) return {}
  const { data } = await db
    .from("memorization_chunks")
    .select("*")
    .in("catalog_id", catalogIds)
    .order("order_index", { ascending: true })
  const map: Record<string, MemChunk[]> = {}
  for (const c of (data as MemChunk[]) ?? []) {
    ;(map[c.catalog_id] ??= []).push(c)
  }
  return map
}

async function loadMemorizedChunkIds(db: SupabaseClient, studentId: string): Promise<Set<string>> {
  const { data } = await db
    .from("student_memorization_chunks")
    .select("chunk_id")
    .eq("student_id", studentId)
  return new Set(((data as { chunk_id: string }[]) ?? []).map((r) => r.chunk_id))
}

/** Re-scan progress tables and award any missing badges/certificates. Idempotent. */
export async function backfillStudentAchievements(
  db: SupabaseClient,
  studentId: string,
): Promise<{ newlyAwarded: number }> {
  const before = await countAchievements(db, studentId)

  const { data: rounds } = await db
    .from("quran_rounds")
    .select("id, type, round_number, desc_completed, asc_completed, completed_at")
    .eq("student_id", studentId)

  for (const round of rounds ?? []) {
    const ref: QuranRoundRef = {
      id: round.id,
      type: round.type as "qaida" | "quran",
      round_number: round.round_number,
    }
    const progress: QuranRoundProgress = {
      desc: round.desc_completed ?? 0,
      asc: round.asc_completed ?? 0,
      completed_at: round.completed_at,
    }
    await ensureQuranRoundAchievements(db, studentId, ref, progress)
  }

  const { data: memItems } = await db
    .from("student_memorization")
    .select(STUDENT_MEM_SELECT)
    .eq("student_id", studentId)

  const items = (memItems as StudentMemItem[]) ?? []
  const catalogIds = items.map((i) => i.catalog_id)
  const chunksByCatalog = await loadChunksByCatalog(db, catalogIds)
  const memorizedIds = await loadMemorizedChunkIds(db, studentId)

  for (const item of items) {
    const chunks = chunksByCatalog[item.catalog_id] ?? []
    const title = item.memorization_catalog.title

    if (chunks.length === 0) {
      if (item.status === "memorized") {
        await syncMemorizationLesson(db, studentId, item.catalog_id, title)
      }
      continue
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!memorizedIds.has(chunk.id)) continue
      await syncMemorizationChunk(db, studentId, chunk, i, title, chunks, memorizedIds)
    }
  }

  const { data: namaz } = await db
    .from("student_namaz")
    .select("status")
    .eq("student_id", studentId)
    .maybeSingle()

  if (namaz?.status === "completed") {
    await syncNamazComplete(db, studentId)
  }

  const after = await countAchievements(db, studentId)
  return { newlyAwarded: Math.max(0, after - before) }
}
