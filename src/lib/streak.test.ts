import { describe, expect, it } from "vitest"

import { computeStreak, nextMilestone, pendingMilestones } from "./streak"

// Mon/Wed/Fri = 1, 3, 5
const MWF = [1, 3, 5]

/** Noon in Pakistan (07:00 UTC) — streak days are PKT, whatever the test machine's zone. */
function localNoon(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 7, 0, 0))
}

/** Session ISO that falls on a given PKT calendar day. */
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

describe("computeStreak with attendance marks", () => {
  // Mon 20, Wed 22, Fri 24 Jul 2026; Mon 27 next week.
  it("skips teacher-absent and holiday days instead of breaking", () => {
    const sessions = [sessionOn(2026, 6, 20), sessionOn(2026, 6, 24), sessionOn(2026, 6, 27)]
    const marks = [{ class_date: "2026-07-22", status: "teacher_absent" as const }]
    const info = computeStreak(MWF, sessions, localNoon(2026, 6, 27), marks)
    expect(info.current).toBe(3)
    // The day off shows as "off" in the week strip, not "missed".
    const holiday = computeStreak(MWF, sessions, localNoon(2026, 6, 24), [
      { class_date: "2026-07-22", status: "holiday" },
    ])
    expect(holiday.week[3]).toBe("off")
  })

  it("still breaks on a student absence", () => {
    const sessions = [sessionOn(2026, 6, 20), sessionOn(2026, 6, 24)]
    const marks = [{ class_date: "2026-07-22", status: "student_absent" as const }]
    expect(computeStreak(MWF, sessions, localNoon(2026, 6, 25), marks).current).toBe(1)
  })

  it("counts a day marked present without a session", () => {
    const sessions = [sessionOn(2026, 6, 20), sessionOn(2026, 6, 24)]
    const marks = [{ class_date: "2026-07-22", status: "present" as const }]
    expect(computeStreak(MWF, sessions, localNoon(2026, 6, 25), marks).current).toBe(3)
  })

  it("doesn't expect a class today when today is the teacher's day off", () => {
    const info = computeStreak(MWF, [sessionOn(2026, 6, 22)], localNoon(2026, 6, 24), [
      { class_date: "2026-07-24", status: "teacher_absent" },
    ])
    expect(info.todayScheduled).toBe(false)
    expect(info.current).toBe(1)
  })

  it("dates a late-evening PKT class on its Pakistan day", () => {
    // 23:30 PKT Wed 22 = 18:30 UTC — still Wednesday in Pakistan.
    const late = new Date(Date.UTC(2026, 6, 22, 18, 30)).toISOString()
    const info = computeStreak(MWF, [sessionOn(2026, 6, 20), late], localNoon(2026, 6, 23))
    expect(info.current).toBe(2)
  })
})
