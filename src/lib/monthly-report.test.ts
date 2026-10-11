import { describe, expect, it } from "vitest"

import {
  computeAttendance,
  computeMemorization,
  computeReadingProgress,
  countRevisions,
  defaultReportMonth,
  monthRange,
  parseReportMonth,
  pktDateKey,
  positionLabel,
} from "./monthly-report"

const SEPT = { year: 2026, month: 9 }

describe("months", () => {
  it("parses YYYY-MM and rejects junk", () => {
    expect(parseReportMonth("2026-09")).toEqual(SEPT)
    expect(parseReportMonth("2026-13")).toBeNull()
    expect(parseReportMonth("26-9")).toBeNull()
    expect(parseReportMonth(null)).toBeNull()
  })

  it("defaults to the previous month in PKT, across a year boundary", () => {
    expect(defaultReportMonth(new Date("2026-10-11T10:00:00Z"))).toEqual(SEPT)
    expect(defaultReportMonth(new Date("2027-01-03T10:00:00Z"))).toEqual({ year: 2026, month: 12 })
    // 31 Oct 20:00 UTC is already 1 Nov in Pakistan → report October.
    expect(defaultReportMonth(new Date("2026-10-31T20:00:00Z"))).toEqual({ year: 2026, month: 10 })
  })

  it("bounds the month at PKT midnight", () => {
    expect(monthRange(SEPT)).toEqual({
      start: "2026-09-01T00:00:00+05:00",
      end: "2026-10-01T00:00:00+05:00",
    })
    expect(monthRange({ year: 2026, month: 12 }).end).toBe("2027-01-01T00:00:00+05:00")
  })

  it("dates an instant on the PKT calendar", () => {
    expect(pktDateKey("2026-09-30T20:30:00Z")).toBe("2026-10-01")
    expect(pktDateKey("2026-09-30T18:00:00Z")).toBe("2026-09-30")
  })
})

describe("computeAttendance", () => {
  // Sept 2026: 1st is a Tuesday. Mon/Wed/Fri classes → 13 scheduled days.
  const base = {
    month: SEPT,
    classDays: [1, 3, 5],
    startedAt: "2025-01-01",
    endedAt: null,
    today: "2026-10-11",
  }

  it("counts scheduled, attended, missed and make-up classes", () => {
    const a = computeAttendance({
      ...base,
      // Wed 2nd, Fri 4th (07:00 PKT), and Sat 5th (a make-up class).
      sessionStarts: ["2026-09-02T10:00:00Z", "2026-09-04T02:00:00Z", "2026-09-05T10:00:00Z"],
      sessionSeconds: [1800, 2700, 900],
    })
    expect(a).toEqual({
      scheduled: 13,
      attended: 2,
      missed: 11,
      extra: 1,
      sessions: 3,
      totalMinutes: 90,
    })
  })

  it("ignores days before enrolment and after today", () => {
    const a = computeAttendance({
      ...base,
      startedAt: "2026-09-15",
      today: "2026-09-20",
      sessionStarts: [],
      sessionSeconds: [],
    })
    // Wed 16, Fri 18 only.
    expect(a.scheduled).toBe(2)
  })

  it("schedules nothing without class days", () => {
    const a = computeAttendance({ ...base, classDays: null, sessionStarts: [], sessionSeconds: [] })
    expect(a.scheduled).toBe(0)
  })
})

describe("computeReadingProgress", () => {
  const s = (
    starting_para: number,
    ending_para: number,
    ending_page: number,
    starting_page: number | null = null,
  ) => ({ starting_para, starting_page, ending_para, ending_page, paras_covered: [] })

  it("counts exact pages when sessions save their starting page", () => {
    const r = computeReadingProgress([s(3, 3, 9, 4), s(3, 3, 15, 9)], s(3, 3, 4))
    expect(r.start).toEqual({ para: 3, page: 4 })
    expect(r.end).toEqual({ para: 3, page: 15 })
    expect(r.pages).toBe(11)
    expect(r.pagesApproximate).toBe(false)
  })

  it("falls back to the previous end and marks it approximate", () => {
    const r = computeReadingProgress([s(3, 3, 9), s(3, 3, 15)], s(2, 3, 4))
    expect(r.pages).toBe(11)
    expect(r.pagesApproximate).toBe(true)
  })

  it("crosses a para using its page count, in either direction", () => {
    const forward = computeReadingProgress([s(3, 4, 5, 18)], null, { 3: 20 })
    expect(forward.pages).toBe(2 + 4)
    expect(forward.pagesApproximate).toBe(false)
    const backward = computeReadingProgress([s(30, 29, 3, 19)], null, { 30: 22 })
    expect(backward.pages).toBe(3 + 2)
  })

  it("is approximate when the old para's size is unknown", () => {
    const r = computeReadingProgress([s(3, 4, 5, 18)], null)
    expect(r.pages).toBe(4)
    expect(r.pagesApproximate).toBe(true)
  })

  it("lists distinct paras, including Qaida as 0", () => {
    const r = computeReadingProgress(
      [
        { ...s(0, 0, 7, 3), paras_covered: [0] },
        { ...s(5, 6, 2, 10), paras_covered: [5, 6] },
      ],
      null,
    )
    expect(r.paras).toEqual([0, 5, 6])
  })

  it("returns empty progress for a month without sessions", () => {
    const r = computeReadingProgress([], s(3, 3, 4))
    expect(r.end).toBeNull()
    expect(r.pages).toBeNull()
    expect(r.paras).toEqual([])
  })

  it("labels positions", () => {
    expect(positionLabel({ para: 0, page: 7 })).toBe("Norani Qaida, page 7")
    expect(positionLabel({ para: 12, page: null })).toBe("Para 12")
    expect(positionLabel(null)).toBe("—")
  })
})

describe("memorization", () => {
  const range = monthRange(SEPT)

  it("counts parts this month and lessons finished this month", () => {
    const m = computeMemorization(
      [
        // Finished in September.
        {
          title: "Surah Al-Kawthar",
          totalChunks: 2,
          memorizedAt: ["2026-08-20T10:00:00Z", "2026-09-03T10:00:00Z"],
        },
        // Two parts in September, not finished.
        {
          title: "Ayat al-Kursi",
          totalChunks: 5,
          memorizedAt: ["2026-09-10T10:00:00Z", "2026-09-12T10:00:00Z"],
        },
        // Finished in August — not this month.
        { title: "Surah Al-Ikhlas", totalChunks: 1, memorizedAt: ["2026-08-01T10:00:00Z"] },
      ],
      range,
    )
    expect(m.partsByLesson).toEqual([
      { title: "Surah Al-Kawthar", parts: 1 },
      { title: "Ayat al-Kursi", parts: 2 },
    ])
    expect(m.partsTotal).toBe(3)
    expect(m.lessonsCompleted).toEqual(["Surah Al-Kawthar"])
  })

  it("counts revisions per title, most first", () => {
    expect(
      countRevisions([
        { memorization_revised: ["Ayat al-Kursi", "Surah Al-Asr"] },
        { memorization_revised: ["Surah Al-Asr"] },
        { memorization_revised: null },
      ]),
    ).toEqual([
      { title: "Surah Al-Asr", times: 2 },
      { title: "Ayat al-Kursi", times: 1 },
    ])
  })
})
