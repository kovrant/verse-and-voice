import { describe, expect, it } from "vitest"

import {
  calculateLineBounds,
  calculateMushafLine,
  DEFAULT_BOTTOM_MARGIN_RATIO,
  DEFAULT_MUSHAF_LINES,
  DEFAULT_TOP_MARGIN_RATIO,
} from "@/lib/mushaf-pointer"

describe("mushaf-pointer (15-line Mushaf)", () => {
  it("calculates 15-line mushaf line index from y ratio taking margins into account", () => {
    // Clicks within top margin (Surah / Juz decorative header band <= 0.075) map to Line 1
    expect(calculateMushafLine(0.0)).toBe(1)
    expect(calculateMushafLine(0.05)).toBe(1)
    expect(calculateMushafLine(0.075)).toBe(1)

    // First line of text (0.075 to 0.075 + 0.058 = 0.133)
    expect(calculateMushafLine(0.10)).toBe(1)

    // Second line of text (~0.133 to ~0.191)
    expect(calculateMushafLine(0.14)).toBe(2)

    // Middle lines
    expect(calculateMushafLine(0.50)).toBe(8)

    // 15th line of text (~0.887 to 0.945)
    expect(calculateMushafLine(0.90)).toBe(15)

    // Clicks within bottom footer margin (>= 0.945) map to Line 15
    expect(calculateMushafLine(0.95)).toBe(15)
    expect(calculateMushafLine(1.0)).toBe(15)
  })

  it("handles out of bounds gracefully", () => {
    expect(calculateMushafLine(-0.2)).toBe(1)
    expect(calculateMushafLine(1.5)).toBe(15)
  })

  it("calculates line highlight bounds correctly with margins", () => {
    const textHeight = 1 - DEFAULT_TOP_MARGIN_RATIO - DEFAULT_BOTTOM_MARGIN_RATIO // 0.87
    const expectedLineHeightPercent = Number(((textHeight / DEFAULT_MUSHAF_LINES) * 100).toFixed(3)) // 5.8%

    const line1 = calculateLineBounds(1)
    expect(line1.topPercent).toBe(7.5)
    expect(line1.heightPercent).toBe(expectedLineHeightPercent)

    const line8 = calculateLineBounds(8)
    const expectedLine8Top = Number(((DEFAULT_TOP_MARGIN_RATIO + 7 * (textHeight / 15)) * 100).toFixed(3))
    expect(line8.topPercent).toBe(expectedLine8Top)
    expect(line8.heightPercent).toBe(expectedLineHeightPercent)

    const line15 = calculateLineBounds(15)
    const expectedLine15Top = Number(((DEFAULT_TOP_MARGIN_RATIO + 14 * (textHeight / 15)) * 100).toFixed(3))
    expect(line15.topPercent).toBe(expectedLine15Top)
    expect(line15.heightPercent).toBe(expectedLineHeightPercent)
    // line15 top + height should equal exactly 100% - bottom margin (94.5%)
    expect(Number((line15.topPercent + line15.heightPercent).toFixed(1))).toBe(94.5)
  })
})

