import { awardBadge, ensureBadge } from "@/lib/badges"
import {
  isFullQuranComplete,
  khatmBadgeSlug,
  newlyCompletedParas,
  paraBadgeSlug,
  QAIDA_COMPLETE_SLUG,
  type RoundProgress,
  type RoundRef,
  QURAN_HALF_SLUG,
  totalParas,
} from "@/lib/quran-achievement-logic"

export type { RoundProgress, RoundRef } from "@/lib/quran-achievement-logic"

/** Award badges after a quran_rounds row changes. Best-effort — never blocks the save. */
export async function syncQuranRoundAchievements(
  studentId: string,
  round: RoundRef,
  before: RoundProgress,
  after: RoundProgress,
): Promise<void> {
  try {
    if (round.type === "qaida") {
      if (!before.completed_at && after.completed_at) {
        await awardBadge(studentId, QAIDA_COMPLETE_SLUG, `round:${round.id}`)
      }
      return
    }

    for (const para of newlyCompletedParas(before, after)) {
      await awardBadge(studentId, paraBadgeSlug(para), `round:${round.id}:para:${para}`)
    }

    const prevTotal = totalParas(before.desc, before.asc)
    const nextTotal = totalParas(after.desc, after.asc)
    if (prevTotal < 15 && nextTotal >= 15) {
      await awardBadge(studentId, QURAN_HALF_SLUG, `round:${round.id}`)
    }

    if (!before.completed_at && isFullQuranComplete(after)) {
      const slug = khatmBadgeSlug(round.round_number)
      const title = round.round_number <= 1 ? "Khatm" : `Khatm ${round.round_number}`
      await ensureBadge(slug, title, "Completed a full reading of the Quran")
      await awardBadge(studentId, slug, `round:${round.id}`)
    }
  } catch {
    // ponytail: progress save is source of truth; badge award is best-effort
  }
}
