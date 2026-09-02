import type { QuranRoundProgress } from "../types"

/** Paras finished in a round (asc = 1..N from the start, desc = from para 30). */
export function parasCompleted(desc: number, asc: number): number[] {
  const set = new Set<number>()
  for (let p = 1; p < asc; p++) set.add(p)
  for (let i = 0; i < desc; i++) set.add(30 - i)
  return [...set].sort((a, b) => a - b)
}

export function totalParas(desc: number, asc: number): number {
  return desc + (asc > 0 ? asc - 1 : 0)
}

export function newlyCompletedParas(
  before: Pick<QuranRoundProgress, "desc" | "asc">,
  after: Pick<QuranRoundProgress, "desc" | "asc">,
): number[] {
  const prev = new Set(parasCompleted(before.desc, before.asc))
  return parasCompleted(after.desc, after.asc).filter((p) => !prev.has(p))
}

export function isFullQuranComplete(progress: QuranRoundProgress): boolean {
  if (!progress.completed_at) return false
  return totalParas(progress.desc, progress.asc) >= 30
}

/** Khatm eligibility — includes legacy rounds where only completed_at was saved. */
export function qualifiesForKhatm(progress: QuranRoundProgress): boolean {
  if (!progress.completed_at) return false
  if (totalParas(progress.desc, progress.asc) >= 30) return true
  // ponytail: "Complete" used to set completed_at alone; treat as khatm on backfill
  return progress.desc === 0 && progress.asc === 0
}

export function isQaidaComplete(before: QuranRoundProgress, after: QuranRoundProgress): boolean {
  return !before.completed_at && !!after.completed_at
}

export function crossedHalfQuran(
  before: Pick<QuranRoundProgress, "desc" | "asc">,
  after: Pick<QuranRoundProgress, "desc" | "asc">,
): boolean {
  return totalParas(before.desc, before.asc) < 15 && totalParas(after.desc, after.asc) >= 15
}

export function khatmJustCompleted(
  before: QuranRoundProgress,
  after: QuranRoundProgress,
): boolean {
  return !before.completed_at && isFullQuranComplete(after)
}
