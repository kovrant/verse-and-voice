import { describe, it, expect } from "vitest"
import {
  computeProgress,
  getActiveRound,
  getStudentStage,
  getChronologicalRoundNumber,
  type QuranRound,
} from "./quran-progress"

// Helper to build a round with sensible defaults.
function round(p: Partial<QuranRound>): QuranRound {
  return {
    id: Math.random().toString(36).slice(2),
    student_id: "s1",
    type: "quran",
    round_number: 1,
    started_at: "2020-01-01",
    completed_at: null,
    desc_completed: 0,
    asc_completed: 0,
    ...p,
  }
}

// Bugs 5 & 6 — progress math. asc_completed is 1-indexed ("currently on para N"),
// so total = desc + max(asc - 1, 0). A finished round is desc=30, asc=0 => 30/30.
describe("computeProgress", () => {
  it("is 0 at the very start", () => {
    expect(computeProgress(0, 0)).toEqual({ currentPara: null, total: 0, isCompleted: false })
  })

  it("on para 1 = 0 paras done", () => {
    expect(computeProgress(0, 1)).toEqual({ currentPara: 1, total: 0, isCompleted: false })
  })

  it("on para 19 = 18 paras done", () => {
    expect(computeProgress(0, 19)).toMatchObject({ currentPara: 19, total: 18 })
  })

  it("combines desc + asc progress", () => {
    expect(computeProgress(5, 20)).toMatchObject({ currentPara: 20, total: 24 })
  })

  it("treats a completed round (desc=30, asc=0) as 30/30 complete", () => {
    expect(computeProgress(30, 0)).toEqual({ currentPara: null, total: 30, isCompleted: true })
  })

  it("documents the old bug: desc=30 AND asc=30 wrongly totals 59 (now avoided)", () => {
    // This is what the buggy save produced; the fix stores desc=30, asc=0 instead.
    expect(computeProgress(30, 30).total).toBe(59)
  })
})

// Bug 12 — getActiveRound must return the LATEST incomplete round, not the first.
describe("getActiveRound", () => {
  it("returns null when there are no rounds", () => {
    expect(getActiveRound([])).toBeNull()
  })

  it("returns null when all rounds are completed", () => {
    const rounds = [
      round({ completed_at: "2021-01-01" }),
      round({ completed_at: "2022-01-01", started_at: "2021-06-01", round_number: 2 }),
    ]
    expect(getActiveRound(rounds)).toBeNull()
  })

  it("returns the most recent incomplete round even when listed oldest-first", () => {
    const older = round({ id: "old", started_at: "2021-02-01", round_number: 2 })
    const newer = round({ id: "new", started_at: "2022-01-01", round_number: 3 })
    // Oldest-first ordering — the old buggy find() would have returned `older`.
    expect(getActiveRound([older, newer])!.id).toBe("new")
    // Order-independent.
    expect(getActiveRound([newer, older])!.id).toBe("new")
  })

  it("breaks same-date ties by round_number", () => {
    const a = round({ id: "a", started_at: "2022-01-01", round_number: 1 })
    const b = round({ id: "b", started_at: "2022-01-01", round_number: 2 })
    expect(getActiveRound([a, b])!.id).toBe("b")
  })
})

describe("getStudentStage", () => {
  it("counts completed quran rounds", () => {
    const rounds = [
      round({ type: "qaida", completed_at: "2020-06-01" }),
      round({ type: "quran", completed_at: "2021-06-01", round_number: 1 }),
      round({ type: "quran", completed_at: "2022-06-01", round_number: 2, started_at: "2021-07-01" }),
      round({ type: "quran", round_number: 3, started_at: "2022-07-01" }), // active
    ]
    const stage = getStudentStage(rounds)
    expect(stage.completedQuranCount).toBe(2)
    expect(stage.completedQaidaCount).toBe(1)
    expect(stage.activeRound?.round_number).toBe(3)
    expect(stage.isQaida).toBe(false)
  })
})

describe("getChronologicalRoundNumber", () => {
  it("numbers completed quran rounds first, then the active one", () => {
    const r1 = round({ id: "r1", type: "quran", completed_at: "2021-01-01", started_at: "2020-01-01" })
    const r2 = round({ id: "r2", type: "quran", completed_at: "2022-01-01", started_at: "2021-02-01" })
    const active = round({ id: "r3", type: "quran", started_at: "2022-02-01" })
    const rounds = [active, r2, r1]
    expect(getChronologicalRoundNumber(rounds, r1)).toBe(1)
    expect(getChronologicalRoundNumber(rounds, r2)).toBe(2)
    expect(getChronologicalRoundNumber(rounds, active)).toBe(3)
  })
})
