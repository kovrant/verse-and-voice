import { describe, expect, it } from "vitest"

import {
  khatmBadgeSlug,
  newlyCompletedParas,
  paraBadgeSlug,
  parasCompleted,
  totalParas,
} from "./quran-achievement-logic"

describe("parasCompleted", () => {
  it("collects paras from both ends", () => {
    expect(parasCompleted(2, 5)).toEqual([1, 2, 3, 4, 29, 30])
  })

  it("returns all 30 when the round is finished", () => {
    expect(parasCompleted(30, 0)).toHaveLength(30)
  })
})

describe("newlyCompletedParas", () => {
  it("returns only paras gained since the last state", () => {
    expect(newlyCompletedParas({ desc: 0, asc: 5 }, { desc: 0, asc: 6 })).toEqual([5])
  })

  it("returns nothing when progress is unchanged", () => {
    expect(newlyCompletedParas({ desc: 1, asc: 4 }, { desc: 1, asc: 4 })).toEqual([])
  })
})

describe("totalParas", () => {
  it("matches the dashboard progress formula", () => {
    expect(totalParas(3, 8)).toBe(10)
    expect(totalParas(30, 0)).toBe(30)
  })
})

describe("badge slugs", () => {
  it("zero-pads para slugs", () => {
    expect(paraBadgeSlug(1)).toBe("para_01")
    expect(paraBadgeSlug(15)).toBe("para_15")
  })

  it("uses the generic khatm slug for round 1", () => {
    expect(khatmBadgeSlug(1)).toBe("quran_khatm")
    expect(khatmBadgeSlug(2)).toBe("khatm_2")
  })
})
