import { describe, expect, it } from "vitest"

import {
  attendanceTotals,
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

describe("attendanceTotals", () => {
  it("doesn't count teacher-absent or holiday days against the student", () => {
    expect(
      attendanceTotals([
        { date: "2026-09-02", scheduled: true, status: "present" },
        { date: "2026-09-04", scheduled: true, status: "student_absent" },
        { date: "2026-09-07", scheduled: true, status: "teacher_absent" },
        { date: "2026-09-09", scheduled: true, status: "holiday" },
        { date: "2026-09-11", scheduled: true, status: "unmarked" },
        // A make-up class on an unscheduled day isn't part of the ratio.
        { date: "2026-09-12", scheduled: false, status: "present" },
      ]),
    ).toEqual({ attended: 1, counted: 3 })
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

  it("crosses a para using its recorded size, in either direction", () => {
    const forward = computeReadingProgress([s(3, 4, 5, 18)], null, { 3: 20 })
    expect(forward.pages).toBe(2 + 4)
    expect(forward.parasCompleted).toEqual([3])
    const backward = computeReadingProgress([s(30, 29, 3, 19)], null, { 30: 22 })
    expect(backward.pages).toBe(3 + 2)
    expect(backward.parasCompleted).toEqual([30])
  })

  it("assumes 18 pages per para when the size is unknown", () => {
    const r = computeReadingProgress([s(3, 4, 5, 15)], null)
    expect(r.pages).toBe(3 + 4)
    expect(r.pagesApproximate).toBe(false)
  })

  it("counts paras completed over the month, not Qaida", () => {
    const r = computeReadingProgress(
      [s(0, 1, 4, 30), s(1, 2, 3, 4), s(2, 2, 10, 3), s(2, 3, 2, 10)],
      null,
    )
    expect(r.parasCompleted).toEqual([1, 2])
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
