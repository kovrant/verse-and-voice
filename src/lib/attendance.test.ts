import { describe, expect, it } from "vitest"

import {
  buildAttendanceDays,
  buildMonthAttendance,
  isScheduledDay,
  localDateKey,
  monthLabel,
  scheduledDates,
  shiftMonth,
  summarizeAttendance,
} from "./attendance"

const MWF = [1, 3, 5]

function sessionOn(
  y: number,
  m0: number,
  d: number,
  duration = 2400,
): { started_at: string; duration_seconds: number } {
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

describe("isScheduledDay", () => {
  it("uses the date's own weekday", () => {
    expect(isScheduledDay("2026-10-12", [1])).toBe(true) // Monday
    expect(isScheduledDay("2026-10-11", [0])).toBe(true) // Sunday
    expect(isScheduledDay("2026-10-17", [6])).toBe(true) // Saturday
    expect(isScheduledDay("2026-10-12", [0, 2])).toBe(false)
  })

  it("handles leap days and year ends", () => {
    expect(isScheduledDay("2028-02-29", [2])).toBe(true) // Tuesday
    expect(isScheduledDay("2026-12-31", [4])).toBe(true) // Thursday
  })

  it("is false with no class days", () => {
    expect(isScheduledDay("2026-10-12", null)).toBe(false)
    expect(isScheduledDay("2026-10-12", [])).toBe(false)
  })
})

describe("scheduledDates", () => {
  const oct = { year: 2026, month: 10 }

  it("lists every scheduled weekday in a past month", () => {
    expect(scheduledDates(oct, [1], null, null, "2026-12-01")).toEqual([
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ])
  })

  it("stops at today inclusive", () => {
    expect(scheduledDates(oct, [1], null, null, "2026-10-12")).toEqual(["2026-10-05", "2026-10-12"])
  })

  it("starts at enrolment and stops at ended_at inclusive", () => {
    expect(scheduledDates(oct, [1], "2026-10-12", "2026-10-19", "2026-12-01")).toEqual([
      "2026-10-12",
      "2026-10-19",
    ])
  })

  it("covers December and February month lengths", () => {
    expect(scheduledDates({ year: 2026, month: 12 }, [4], null, null, "2027-01-01").at(-1)).toBe(
      "2026-12-31",
    )
    expect(scheduledDates({ year: 2028, month: 2 }, [2], null, null, "2028-03-01").at(-1)).toBe(
      "2028-02-29",
    )
  })

  it("is empty without class days", () => {
    expect(scheduledDates(oct, null, null, null, "2026-12-01")).toEqual([])
  })
})

describe("buildAttendanceDays / summarizeAttendance", () => {
  it("returns nothing for empty inputs", () => {
    const days = buildAttendanceDays({ scheduled: [], sessionDates: [], marks: [] })
    expect(days).toEqual([])
    expect(summarizeAttendance(days)).toEqual({
      present: 0,
      student_absent: 0,
      teacher_absent: 0,
      holiday: 0,
      unmarked: 0,
      scheduled: 0,
    })
  })

  it("applies mark > session > unmarked precedence, sorted ascending", () => {
    const days = buildAttendanceDays({
      scheduled: ["2026-10-12", "2026-10-05", "2026-10-19"],
      sessionDates: ["2026-10-05", "2026-10-12"],
      marks: [{ class_date: "2026-10-12", status: "teacher_absent" }],
    })
    expect(days).toEqual([
      { date: "2026-10-05", scheduled: true, status: "present" },
      { date: "2026-10-12", scheduled: true, status: "teacher_absent" },
      { date: "2026-10-19", scheduled: true, status: "unmarked" },
    ])
  })

  it("counts an unscheduled make-up class as present", () => {
    const days = buildAttendanceDays({
      scheduled: ["2026-10-05"],
      sessionDates: ["2026-10-07"],
      marks: [
        { class_date: "2026-10-05", status: "student_absent" },
        { class_date: "2026-10-09", status: "holiday" },
      ],
    })
    expect(days).toEqual([
      { date: "2026-10-05", scheduled: true, status: "student_absent" },
      { date: "2026-10-07", scheduled: false, status: "present" },
      { date: "2026-10-09", scheduled: false, status: "holiday" },
    ])
    expect(summarizeAttendance(days)).toMatchObject({
      present: 1,
      student_absent: 1,
      holiday: 1,
      unmarked: 0,
      scheduled: 1,
    })
  })
})
