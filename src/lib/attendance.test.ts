import { describe, expect, it } from "vitest"

import { buildMonthAttendance, localDateKey, monthLabel, shiftMonth } from "./attendance"

const MWF = [1, 3, 5]

function sessionOn(y: number, m0: number, d: number, duration = 2400): { started_at: string; duration_seconds: number } {
  return {
    started_at: new Date(y, m0, d, 12, 0, 0).toISOString(),
    duration_seconds: duration,
  }
}

describe("buildMonthAttendance", () => {
  it("returns unconfigured when class_days is empty", () => {
    const r = buildMonthAttendance(null, [], 2026, 2, new Date(2026, 2, 15))
    expect(r.configured).toBe(false)
    expect(r.days).toEqual([])
  })

  it("marks attended and missed scheduled days in March 2026", () => {
    const sessions = [sessionOn(2026, 2, 2), sessionOn(2026, 2, 4), sessionOn(2026, 2, 6)]
    const now = new Date(2026, 2, 10)
    const r = buildMonthAttendance(MWF, sessions, 2026, 2, now)
    expect(r.attendedCount).toBe(3)
    expect(r.dueCount).toBe(4)
    const mar9 = r.days.find((d) => d.dateKey === "2026-03-09")
    expect(mar9?.status).toBe("missed")
    const mar11 = r.days.find((d) => d.dateKey === "2026-03-11")
    expect(mar11?.status).toBe("upcoming")
  })

  it("counts full month when viewing a past month", () => {
    const sessions = [sessionOn(2026, 0, 5), sessionOn(2026, 0, 7)]
    const r = buildMonthAttendance(MWF, sessions, 2026, 0, new Date(2026, 5, 1))
    expect(r.dueCount).toBeGreaterThan(0)
    expect(r.attendedCount).toBe(2)
  })
})

describe("shiftMonth", () => {
  it("steps backward across year boundary", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe("monthLabel", () => {
  it("formats month name", () => {
    expect(monthLabel(2026, 2)).toContain("2026")
  })
})

describe("localDateKey", () => {
  it("uses local calendar date", () => {
    expect(localDateKey(new Date(2026, 2, 9, 23, 0, 0))).toBe("2026-03-09")
  })
})
