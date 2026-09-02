import { describe, expect, it } from "vitest"

import { newlyCompletedParas, parasCompleted, totalParas } from "./completion/quran"
import { qualifiesForKhatm } from "./completion/quran"
import { khatmSlug, paraSlug, slugIssuesCertificate } from "./slugs"

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

describe("achievement slugs", () => {
  it("zero-pads para slugs", () => {
    expect(paraSlug(1)).toBe("para_01")
    expect(paraSlug(15)).toBe("para_15")
  })

  it("uses the generic khatm slug for round 1", () => {
    expect(khatmSlug(1)).toBe("quran_khatm")
    expect(khatmSlug(2)).toBe("khatm_2")
  })

  it("issues certificates only for major milestones", () => {
    expect(slugIssuesCertificate("qaida_complete")).toBe(true)
    expect(slugIssuesCertificate("quran_khatm")).toBe(true)
    expect(slugIssuesCertificate("khatm_2")).toBe(true)
    expect(slugIssuesCertificate("namaz_complete")).toBe(true)
    expect(slugIssuesCertificate("para_05")).toBe(false)
    expect(slugIssuesCertificate("quran_half")).toBe(false)
  })

  it("qualifies legacy khatm rounds closed with completed_at only", () => {
    expect(
      qualifiesForKhatm({ desc: 30, asc: 0, completed_at: "2026-01-01" }),
    ).toBe(true)
    expect(
      qualifiesForKhatm({ desc: 0, asc: 0, completed_at: "2026-01-01" }),
    ).toBe(true)
    expect(qualifiesForKhatm({ desc: 0, asc: 0, completed_at: null })).toBe(false)
    expect(qualifiesForKhatm({ desc: 10, asc: 5, completed_at: "2026-01-01" })).toBe(false)
  })
})
