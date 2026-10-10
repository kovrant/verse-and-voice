import { describe, expect, it } from "vitest"

import { classPosition, type ClassSession } from "./class-student-card"
import type { QuranRound } from "./quran-progress"

function round(p: Partial<QuranRound>): QuranRound {
  return {
    id: "r1",
    student_id: "s1",
    type: "quran",
    round_number: 1,
    started_at: "2026-01-01",
    completed_at: null,
    desc_completed: 0,
    asc_completed: 0,
    ...p,
  }
}

function session(p: Partial<ClassSession>): ClassSession {
  return {
    id: Math.random().toString(36).slice(2),
    started_at: "2026-10-01T10:00:00Z",
    ended_at: "2026-10-01T10:30:00Z",
    duration_seconds: 1800,
    starting_para: null,
    ending_para: null,
    paras_covered: [],
    memorization_revised: [],
    notes: null,
    ...p,
  }
}

describe("classPosition — Quran round", () => {
  const rounds = [round({ asc_completed: 5 })]

  it("uses the latest session's para, page and line", () => {
    const pos = classPosition(rounds, [
      session({ ending_para: 7, ending_page: 12, ending_line: 3 }),
    ])
    expect(pos).toMatchObject({ para: 7, page: 12, line: 3 })
  })

  it("falls back to the round's para when the latest session isn't 1..30", () => {
    expect(classPosition(rounds, [session({ ending_para: 0, ending_page: 4 })]).para).toBe(5)
    expect(classPosition(rounds, []).para).toBe(5)
    expect(classPosition([round({ asc_completed: 0 })], []).para).toBe(1)
  })
})

describe("classPosition — Qaida round", () => {
  const rounds = [round({ type: "qaida" })]

  it("is para 0 at the latest Qaida session's page and line", () => {
    const sessions = [
      session({ ending_para: 3, ending_page: 20 }), // an older Quran session listed first must not win
      session({ ending_para: 0, ending_page: 9, ending_line: 4 }),
      session({ ending_para: 0, ending_page: 2 }),
    ]
    expect(classPosition(rounds, sessions)).toMatchObject({ para: 0, page: 9, line: 4 })
  })

  it("is para 0 with no position when there's no Qaida session yet", () => {
    expect(classPosition(rounds, [session({ ending_para: 5, ending_page: 3 })])).toMatchObject({
      para: 0,
      page: null,
      line: null,
    })
  })
})
