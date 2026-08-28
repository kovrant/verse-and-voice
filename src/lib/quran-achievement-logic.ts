export const QAIDA_COMPLETE_SLUG = "qaida_complete"
export const QURAN_HALF_SLUG = "quran_half"
const QURAN_KHATM_SLUG = "quran_khatm"

export interface RoundProgress {
  desc: number
  asc: number
  completed_at: string | null
}

export interface RoundRef {
  id: string
  type: "qaida" | "quran"
  round_number: number
}

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
  before: Pick<RoundProgress, "desc" | "asc">,
  after: Pick<RoundProgress, "desc" | "asc">,
): number[] {
  const prev = new Set(parasCompleted(before.desc, before.asc))
  return parasCompleted(after.desc, after.asc).filter((p) => !prev.has(p))
}

export function paraBadgeSlug(para: number): string {
  return `para_${String(para).padStart(2, "0")}`
}

export function khatmBadgeSlug(roundNumber: number): string {
  return roundNumber <= 1 ? QURAN_KHATM_SLUG : `khatm_${roundNumber}`
}

export function isFullQuranComplete(progress: RoundProgress): boolean {
  if (!progress.completed_at) return false
  return totalParas(progress.desc, progress.asc) >= 30
}
