/** localStorage baseline — achievements the student has already been notified about. */

export function achievementSeenStorageKey(studentId: string): string {
  return `ach-seen-${studentId}`
}

export function readSeenAchievementIds(studentId: string): string[] | null {
  try {
    const raw = localStorage.getItem(achievementSeenStorageKey(studentId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
  } catch {
    return null
  }
}

export function writeSeenAchievementIds(studentId: string, ids: string[]): void {
  try {
    localStorage.setItem(achievementSeenStorageKey(studentId), JSON.stringify(ids))
  } catch {
    // ponytail: celebrations are best-effort
  }
}

/** First visit: baseline all current ids without celebrating. Later: return only new ids. */
export function findNewAchievementIds(
  currentIds: string[],
  seen: string[] | null,
): { newIds: string[]; baselineIds: string[] | null } {
  if (seen === null) {
    return { newIds: [], baselineIds: currentIds }
  }
  const seenSet = new Set(seen)
  return { newIds: currentIds.filter((id) => !seenSet.has(id)), baselineIds: null }
}

export function hasUnseenAchievements(currentIds: string[], seen: string[] | null): boolean {
  if (seen === null) return false
  const seenSet = new Set(seen)
  return currentIds.some((id) => !seenSet.has(id))
}
