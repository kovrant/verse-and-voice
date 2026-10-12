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
    paras_covered: number[] = [],
  ) => ({ starting_para, starting_page, ending_para, ending_page, paras_covered })

  it("measures net movement from the previous class's end", () => {
    const r = computeReadingProgress([s(3, 3, 9), s(3, 3, 15)], s(3, 3, 4))
    expect(r.start).toEqual({ para: 3, page: 4 })
    expect(r.end).toEqual({ para: 3, page: 15 })
    expect(r.pages).toBe(11)
    expect(r.parasCompleted).toEqual([])
    expect(r.pagesApproximate).toBe(false)
  })

  it("completes every para between start and end, 18 pages each by default", () => {
    // Para 3 p.12 → Para 5 p.6: rest of 3 (7) + all of 4 (18) + 5 pages of 5.
    const r = computeReadingProgress([s(3, 5, 6)], s(3, 3, 12))
    expect(r.parasCompleted).toEqual([3, 4])
    expect(r.pages).toBe(7 + 18 + 5)
  })

  it("uses a para's recorded size, and works in the descending direction", () => {
    const r = computeReadingProgress([s(30, 29, 3)], s(30, 30, 20), { 30: 22 })
    expect(r.parasCompleted).toEqual([30])
    expect(r.pages).toBe(3 + 2)
  })

  it("ignores browsing between paras inside the month (Ahmed, Sep 2026)", () => {
    // Real sessions: classes opened on Para 20 and the teacher clicked to 22;
    // one session even ended on 20. He actually read Para 22 and moved to 23.
    const r = computeReadingProgress(
      [
        s(20, 22, 12, null, [19, 20, 21, 22]),
        s(20, 22, 13, null, [20, 21, 22]),
        s(20, 20, 2, null, [20]),
        s(20, 22, 2, null, [20, 21, 22]),
        s(22, 22, 15),
        s(22, 22, 18),
        s(22, 23, 1, null, [22, 23]),
      ],
      null,
    )
    expect(r.start).toEqual({ para: 22, page: 12 })
    expect(r.parasCompleted).toEqual([22])
    expect(r.pages).toBe(18 - 12 + 1)
    expect(r.pagesApproximate).toBe(true)
  })

  it("starts from the first class's recorded opening page when there's no earlier class", () => {
    const r = computeReadingProgress([s(3, 3, 9, 4)], null)
    expect(r.start).toEqual({ para: 3, page: 4 })
    expect(r.pages).toBe(5)
    expect(r.pagesApproximate).toBe(false)
  })

  it("never completes Qaida as a para", () => {
    const r = computeReadingProgress([s(0, 1, 4)], s(0, 0, 30))
    expect(r.parasCompleted).toEqual([])
    expect(r.pages).toBe(3)
  })

  it("returns empty progress for a month without sessions", () => {
    const r = computeReadingProgress([], s(3, 3, 4))
    expect(r.end).toBeNull()
    expect(r.pages).toBeNull()
    expect(r.parasCompleted).toEqual([])
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
