import type { SupabaseClient } from "@supabase/supabase-js"

import { getEligibleHadithBadgeSlugs } from "@/lib/hadiths/hadith-engine"
import { HADITH_BADGE_SLUGS } from "@/lib/hadiths/types"
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

export const HADITH_MILESTONE_DEFINITIONS: Record<
  string,
  { slug: string; title: string; description: string; domain: "hadith"; kind: "badge"; issuesCertificate: boolean }
> = {
  [HADITH_BADGE_SLUGS.STARTER]: {
    slug: HADITH_BADGE_SLUGS.STARTER,
    title: "First Hadith Memorized",
    description: "Memorized your first Hadith of Prophet Muhammad (ﷺ)",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.EXPLORER]: {
    slug: HADITH_BADGE_SLUGS.EXPLORER,
    title: "Hadith Explorer",
    description: "Memorized 5 precious Hadiths of Prophet Muhammad (ﷺ)",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.SEEKER]: {
    slug: HADITH_BADGE_SLUGS.SEEKER,
    title: "Sunnah Seeker",
    description: "Memorized 10 Hadiths with their moral lessons and translations",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.CHAMPION]: {
    slug: HADITH_BADGE_SLUGS.CHAMPION,
    title: "Sunnah Champion",
    description: "Memorized 15 Hadiths with their moral lessons and translations",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.GUARDIAN]: {
    slug: HADITH_BADGE_SLUGS.GUARDIAN,
    title: "Hadith Guardian",
    description: "Memorized 25 Hadiths with their moral lessons and translations",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR]: {
    slug: HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR,
    title: "Arba'in Scholar (40 Hadith Master)",
    description: "Completed the noble milestone of memorizing 40 Hadiths",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.GRAND_SCHOLAR]: {
    slug: HADITH_BADGE_SLUGS.GRAND_SCHOLAR,
    title: "Grand Sunnah Scholar (50 Hadith Master)",
    description: "Achieved the highest honor of memorizing 50 Hadiths",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
}

/** Sync Hadith progress → milestone badges. */
export async function syncHadithMemorized(
  db: SupabaseClient,
  studentId: string,
  totalMemorized: number,
): Promise<string[]> {
  const newlyAwarded: string[] = []
  try {
    const eligibleSlugs = getEligibleHadithBadgeSlugs(totalMemorized)
    for (const slug of eligibleSlugs) {
      const def = HADITH_MILESTONE_DEFINITIONS[slug]
      if (!def) continue
      const res = await awardAchievement(db, studentId, slug, "hadith", def)
      if (res.awarded) {
        newlyAwarded.push(def.title)
      }
    }
  } catch (err) {
    console.error("Error syncing hadith achievements:", err)
  }
  return newlyAwarded
}

