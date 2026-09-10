/**
 * 16-line Mushaf pointer & line estimation utilities.
 */

export function calculateMushafLine(yRatio: number, totalLines = 16): number {
  const clamped = Math.max(0, Math.min(0.9999, yRatio))
  return Math.min(totalLines, Math.max(1, Math.floor(clamped * totalLines) + 1))
}

export function calculateLineBounds(
  line: number,
  totalLines = 16,
): { topPercent: number; heightPercent: number } {
  const clampedLine = Math.min(totalLines, Math.max(1, line))
  return {
    topPercent: ((clampedLine - 1) / totalLines) * 100,
    heightPercent: (1 / totalLines) * 100,
  }
}
