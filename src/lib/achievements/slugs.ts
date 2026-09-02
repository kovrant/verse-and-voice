export const QAIDA_COMPLETE_SLUG = "qaida_complete"
export const QURAN_HALF_SLUG = "quran_half"
export const QURAN_KHATM_SLUG = "quran_khatm"
export const NAMAZ_COMPLETE_SLUG = "namaz_complete"

export function paraSlug(para: number): string {
  return `para_${String(para).padStart(2, "0")}`
}

export function khatmSlug(roundNumber: number): string {
  return roundNumber <= 1 ? QURAN_KHATM_SLUG : `khatm_${roundNumber}`
}

export function memPartSlug(chunkId: string): string {
  return `mem_part_${chunkId}`
}

export function memLessonSlug(catalogId: string): string {
  return `mem_lesson_${catalogId}`
}

/** Major milestones that auto-issue a certificate row when earned. */
export function slugIssuesCertificate(slug: string): boolean {
  if (slug === QAIDA_COMPLETE_SLUG || slug === QURAN_KHATM_SLUG || slug === NAMAZ_COMPLETE_SLUG) {
    return true
  }
  return /^khatm_\d+$/.test(slug)
}

export function domainForSlug(slug: string): "quran" | "qaida" | "memorization" | "namaz" {
  if (slug === QAIDA_COMPLETE_SLUG) return "qaida"
  if (slug === NAMAZ_COMPLETE_SLUG) return "namaz"
  if (slug.startsWith("mem_")) return "memorization"
  return "quran"
}
