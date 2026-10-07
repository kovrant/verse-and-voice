/**
 * Where a child is in the Namaz guide, kept in this browser only. Namaz is an
 * open guide with nothing assigned or tracked, so there is no table: the
 * "Continue" spot and the viewed ticks are a per-device convenience.
 * Keys include the student id so siblings sharing a tablet don't share ticks.
 * ponytail: localStorage — moves to a table only if a teacher ever needs to see it.
 */

const key = (studentId: string, what: "viewed" | "last") => `namaz:${studentId}:${what}`

export function readViewed(studentId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(studentId, "viewed"))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function writeViewed(studentId: string, viewed: Set<string>): void {
  try {
    localStorage.setItem(key(studentId, "viewed"), JSON.stringify([...viewed]))
  } catch {
    // private mode / blocked storage: ticks just don't persist
  }
}

export function readLast(studentId: string): string | null {
  try {
    return localStorage.getItem(key(studentId, "last"))
  } catch {
    return null
  }
}

export function writeLast(studentId: string, stopKey: string): void {
  try {
    localStorage.setItem(key(studentId, "last"), stopKey)
  } catch {
    // ignore
  }
}
