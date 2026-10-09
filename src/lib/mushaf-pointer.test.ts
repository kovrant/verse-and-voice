import { describe, expect, it } from "vitest"

import {
  calculateLineBounds,
  calculateMushafLine,
  DEFAULT_BOTTOM_MARGIN_RATIO,
  DEFAULT_MUSHAF_LINES,
  DEFAULT_TOP_MARGIN_RATIO,
} from "@/lib/mushaf-pointer"

describe("mushaf-pointer (16-line Mushaf)", () => {
  it("uses a 16-line layout", () => {
    expect(DEFAULT_MUSHAF_LINES).toBe(16)
  })

  it("calculates 16-line mushaf line index from y ratio taking margins into account", () => {
    // Line height = (1 - 0.075 - 0.055) / 16 = 0.054375
    // Clicks within top margin (Surah / Juz decorative header band <= 0.075) map to Line 1
    expect(calculateMushafLine(0.0)).toBe(1)
    expect(calculateMushafLine(0.05)).toBe(1)
    expect(calculateMushafLine(0.075)).toBe(1)

    // First line of text (0.075 to ~0.129)
    expect(calculateMushafLine(0.10)).toBe(1)

    // Second line of text (~0.129 to ~0.184)
    expect(calculateMushafLine(0.14)).toBe(2)

    // Middle lines
    expect(calculateMushafLine(0.50)).toBe(8)

    // 15th line of text (~0.836 to ~0.891) is no longer the last line
    expect(calculateMushafLine(0.88)).toBe(15)

    // 16th line of text (~0.891 to 0.945)
    expect(calculateMushafLine(0.92)).toBe(16)

    // Clicks within bottom footer margin (>= 0.945) map to Line 16
    expect(calculateMushafLine(0.95)).toBe(16)
    expect(calculateMushafLine(1.0)).toBe(16)
  })

  it("handles out of bounds gracefully", () => {
    expect(calculateMushafLine(-0.2)).toBe(1)
    expect(calculateMushafLine(1.5)).toBe(16)
  })

  it("calculates line highlight bounds correctly with margins", () => {
    const textHeight = 1 - DEFAULT_TOP_MARGIN_RATIO - DEFAULT_BOTTOM_MARGIN_RATIO // 0.87
    const expectedLineHeightPercent = Number(((textHeight / DEFAULT_MUSHAF_LINES) * 100).toFixed(3)) // 5.438%

    const line1 = calculateLineBounds(1)
    expect(line1.topPercent).toBe(7.5)
    expect(line1.heightPercent).toBe(expectedLineHeightPercent)

    const line8 = calculateLineBounds(8)
    const expectedLine8Top = Number(((DEFAULT_TOP_MARGIN_RATIO + 7 * (textHeight / 16)) * 100).toFixed(3))
    expect(line8.topPercent).toBe(expectedLine8Top)
    expect(line8.heightPercent).toBe(expectedLineHeightPercent)

    const line16 = calculateLineBounds(16)
    const expectedLine16Top = Number(((DEFAULT_TOP_MARGIN_RATIO + 15 * (textHeight / 16)) * 100).toFixed(3))
    expect(line16.topPercent).toBe(expectedLine16Top)
    expect(line16.heightPercent).toBe(expectedLineHeightPercent)
    // line16 top + height should equal exactly 100% - bottom margin (94.5%)
    expect(Number((line16.topPercent + line16.heightPercent).toFixed(1))).toBe(94.5)

    // Out-of-range lines clamp to the first / last line
    expect(calculateLineBounds(0)).toEqual(line1)
    expect(calculateLineBounds(17)).toEqual(line16)
  })
})
