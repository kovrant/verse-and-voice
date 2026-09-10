import { describe, expect, it } from "vitest"
import { calculateLineBounds, calculateMushafLine } from "@/lib/mushaf-pointer"

describe("mushaf-pointer", () => {
  it("calculates 16-line mushaf line index from y ratio correctly", () => {
    expect(calculateMushafLine(0.0)).toBe(1)
    expect(calculateMushafLine(0.05)).toBe(1)
    expect(calculateMushafLine(1 / 16)).toBe(2)
    expect(calculateMushafLine(0.5)).toBe(9)
    expect(calculateMushafLine(0.99)).toBe(16)
    expect(calculateMushafLine(1.0)).toBe(16)
  })

  it("handles out of bounds gracefully", () => {
    expect(calculateMushafLine(-0.2)).toBe(1)
    expect(calculateMushafLine(1.5)).toBe(16)
  })

  it("calculates line highlight bounds correctly", () => {
    const line1 = calculateLineBounds(1, 16)
    expect(line1.topPercent).toBe(0)
    expect(line1.heightPercent).toBe(6.25)

    const line8 = calculateLineBounds(8, 16)
    expect(line8.topPercent).toBe(43.75)
    expect(line8.heightPercent).toBe(6.25)

    const line16 = calculateLineBounds(16, 16)
    expect(line16.topPercent).toBe(93.75)
    expect(line16.heightPercent).toBe(6.25)
  })
})
