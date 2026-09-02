import type { SupabaseClient } from "@supabase/supabase-js"

import { chunkProgress, labelFor, type MemChunk } from "@/lib/memorization"

import { awardAchievement } from "./award"
import {
  crossedHalfQuran,
  isQaidaComplete,
  khatmJustCompleted,
  newlyCompletedParas,
  parasCompleted,
  qualifiesForKhatm,
  totalParas,
} from "./completion/quran"
import {
  khatmSlug,
  memLessonSlug,
  memPartSlug,
  NAMAZ_COMPLETE_SLUG,
  paraSlug,
  QAIDA_COMPLETE_SLUG,
  QURAN_HALF_SLUG,
} from "./slugs"
import type { QuranRoundProgress, QuranRoundRef } from "./types"

/** Single entry: sync Quran/Qaida round progress → badges + certificates. */
export async function syncQuranRound(
  db: SupabaseClient,
  studentId: string,
  round: QuranRoundRef,
  before: QuranRoundProgress,
  after: QuranRoundProgress,
): Promise<void> {
  try {
    if (round.type === "qaida") {
      if (isQaidaComplete(before, after)) {
        await awardAchievement(db, studentId, QAIDA_COMPLETE_SLUG, `round:${round.id}`)
      }
      return
    }

    for (const para of newlyCompletedParas(before, after)) {
      await awardAchievement(db, studentId, paraSlug(para), `round:${round.id}:para:${para}`)
    }

    if (crossedHalfQuran(before, after)) {
      await awardAchievement(db, studentId, QURAN_HALF_SLUG, `round:${round.id}`)
    }

    if (khatmJustCompleted(before, after)) {
      const slug = khatmSlug(round.round_number)
      const title = round.round_number <= 1 ? "Khatm" : `Khatm ${round.round_number}`
      await awardAchievement(db, studentId, slug, `round:${round.id}`, {
        slug,
        title,
        description: "Completed a full reading of the Quran",
        domain: "quran",
        kind: "certificate",
        issuesCertificate: true,
      })
    }
  } catch {
    // ponytail: progress save is source of truth; awards are best-effort
  }
}

/** Backfill: award everything a round's current state entitles — not a before/after delta. */
export async function ensureQuranRoundAchievements(
  db: SupabaseClient,
  studentId: string,
  round: QuranRoundRef,
  progress: QuranRoundProgress,
): Promise<void> {
  try {
    if (round.type === "qaida") {
      if (progress.completed_at) {
        await awardAchievement(db, studentId, QAIDA_COMPLETE_SLUG, `round:${round.id}`)
      }
      return
    }

    const paraList =
      totalParas(progress.desc, progress.asc) > 0
        ? parasCompleted(progress.desc, progress.asc)
        : progress.completed_at
          ? Array.from({ length: 30 }, (_, i) => i + 1)
          : []

    for (const para of paraList) {
      await awardAchievement(db, studentId, paraSlug(para), `round:${round.id}:para:${para}`)
    }

    if (totalParas(progress.desc, progress.asc) >= 15 || qualifiesForKhatm(progress)) {
      await awardAchievement(db, studentId, QURAN_HALF_SLUG, `round:${round.id}`)
    }

    if (qualifiesForKhatm(progress)) {
      const slug = khatmSlug(round.round_number)
      const title = round.round_number <= 1 ? "Khatm" : `Khatm ${round.round_number}`
      await awardAchievement(db, studentId, slug, `round:${round.id}`, {
        slug,
        title,
        description: "Completed a full reading of the Quran",
        domain: "quran",
        kind: "certificate",
        issuesCertificate: true,
      })
    }
  } catch {
    // ponytail: best-effort backfill
  }
}

/** Sync memorization chunk marked → part badge; full lesson → lesson badge. */
export async function syncMemorizationChunk(
  db: SupabaseClient,
  studentId: string,
  chunk: MemChunk,
  chunkIndex: number,
  lessonTitle: string,
  allChunks: MemChunk[],
  memorizedIds: Set<string>,
): Promise<void> {
  try {
    const partLabel = labelFor(chunk, chunkIndex)
    const partSlug = memPartSlug(chunk.id)
    await awardAchievement(db, studentId, partSlug, `chunk:${chunk.id}`, {
      slug: partSlug,
      title: `${partLabel} · ${lessonTitle}`,
      description: `Memorized ${partLabel} of ${lessonTitle}`,
      domain: "memorization",
    })

    if (chunkProgress(allChunks, memorizedIds).isMemorized) {
      const lessonSlug = memLessonSlug(chunk.catalog_id)
      await awardAchievement(db, studentId, lessonSlug, `catalog:${chunk.catalog_id}`, {
        slug: lessonSlug,
        title: lessonTitle,
        description: `Memorized ${lessonTitle}`,
        domain: "memorization",
      })
    }
  } catch {
    // ponytail: best-effort alongside the chunk write
  }
}

/** Teacher marks whole unchunked lesson memorized. */
export async function syncMemorizationLesson(
  db: SupabaseClient,
  studentId: string,
  catalogId: string,
  lessonTitle: string,
): Promise<void> {
  try {
    const slug = memLessonSlug(catalogId)
    await awardAchievement(db, studentId, slug, `catalog:${catalogId}`, {
      slug,
      title: lessonTitle,
      description: `Memorized ${lessonTitle}`,
      domain: "memorization",
    })
  } catch {
    // ponytail: best-effort
  }
}

/** Namaz module fully completed. */
export async function syncNamazComplete(db: SupabaseClient, studentId: string): Promise<void> {
  try {
    await awardAchievement(db, studentId, NAMAZ_COMPLETE_SLUG, "namaz_completion")
  } catch {
    // ponytail: best-effort
  }
}
