import { describe, expect, it } from "vitest"

import { computeStreak, nextMilestone, pendingMilestones } from "./streak"

// Mon/Wed/Fri = 1, 3, 5
const MWF = [1, 3, 5]

/** Build a local Date at noon so DST edges don't bite. */
function localNoon(y: number, m0: number, d: number): Date {
  return new Date(y, m0, d, 12, 0, 0)
}

/** Session ISO that falls on a given local calendar day. */
function sessionOn(y: number, m0: number, d: number): string {
  return localNoon(y, m0, d).toISOString()
}

describe("computeStreak", () => {
  it("hides streak when class_days is not configured", () => {
    const info = computeStreak(null, [sessionOn(2026, 6, 20)], localNoon(2026, 6, 20))
    expect(info.configured).toBe(false)
    expect(info.current).toBe(0)
  })

  it("counts consecutive scheduled days and skips off days", () => {
    // Week of Jul 20 2026 is a Monday. MWF: Mon 20, Wed 22, Fri 24.
    const sessions = [
      sessionOn(2026, 6, 20), // Mon
      sessionOn(2026, 6, 22), // Wed
      sessionOn(2026, 6, 24), // Fri
    ]
    // Saturday — off day; streak still 3
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 25))
    expect(info.configured).toBe(true)
    expect(info.current).toBe(3)
    expect(info.todayScheduled).toBe(false)
  })

  it("does not break when today is scheduled but class not yet taken", () => {
    const sessions = [sessionOn(2026, 6, 20), sessionOn(2026, 6, 22)]
    // Friday Jul 24 — scheduled, not yet attended; streak from Wed+Mon = 2
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 24))
    expect(info.todayScheduled).toBe(true)
    expect(info.todayDone).toBe(false)
    expect(info.current).toBe(2)
  })

  it("includes today once the class is taken", () => {
    const sessions = [
      sessionOn(2026, 6, 20),
      sessionOn(2026, 6, 22),
      sessionOn(2026, 6, 24),
    ]
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 24))
    expect(info.todayDone).toBe(true)
    expect(info.current).toBe(3)
  })

  it("breaks when a scheduled day was missed", () => {
    // Attended Mon, skipped Wed, attended Fri — current from Fri only = 1
    const sessions = [sessionOn(2026, 6, 20), sessionOn(2026, 6, 24)]
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 25))
    expect(info.current).toBe(1)
    expect(info.best).toBeGreaterThanOrEqual(1)
  })

  it("tracks personal best across a break", () => {
    // 3-day run, then a miss, then a new 1-day
    const sessions = [
      sessionOn(2026, 6, 13), // Mon
      sessionOn(2026, 6, 15), // Wed
      sessionOn(2026, 6, 17), // Fri  → run of 3
      // skip Mon 20
      sessionOn(2026, 6, 22), // Wed → new run of 1
    ]
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 23))
    expect(info.current).toBe(1)
    expect(info.best).toBe(3)
  })

  it("builds a week strip with off / done / missed / today / upcoming", () => {
    // Wed Jul 22 2026 — attended Mon, missed nothing yet this week before Wed
    const sessions = [sessionOn(2026, 6, 20)] // Mon done
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 22))
    // Sun=0 off, Mon=1 done, Tue=2 off, Wed=3 today, Thu=4 off, Fri=5 upcoming, Sat=6 off
    expect(info.week).toEqual(["off", "done", "off", "today", "off", "upcoming", "off"])
  })
})

describe("milestones", () => {
  it("finds the next milestone", () => {
    expect(nextMilestone(0)).toBe(3)
    expect(nextMilestone(3)).toBe(7)
    expect(nextMilestone(100)).toBeNull()
  })

  it("lists pending celebrations", () => {
    expect(pendingMilestones(7, 0)).toEqual([3, 7])
    expect(pendingMilestones(7, 3)).toEqual([7])
    expect(pendingMilestones(2, 0)).toEqual([])
  })
})
