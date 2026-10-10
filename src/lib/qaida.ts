export interface QaidaItem {
  id: string
  title: string
  file_url: string
  category?: string
}

/**
 * Find the qaida assigned to a student. Returns the matching item, or null when
 * nothing is assigned or the assigned id no longer exists in the library.
 */
export function resolveAssignedQaida<T extends { id: string }>(
  items: T[],
  qaidaMediaId: string | null | undefined,
): T | null {
  if (!qaidaMediaId) return null
  return items.find((item) => item.id === qaidaMediaId) ?? null
}

/** Qaida rides the para slot as the sentinel `para_number = 0` (see okf/domain/qaida-curriculum.md). */
export const QAIDA_PARA = 0

/** "Norani Qaida" for the Qaida sentinel 0, else "Para N". */
export function paraLabel(n: number): string {
  return n === QAIDA_PARA ? "Norani Qaida" : `Para ${n}`
}
