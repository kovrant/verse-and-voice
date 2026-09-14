/**
 * 15-line Mushaf pointer & line estimation utilities.
 * Includes calibrated top and bottom margin offsets for Quran page headers & footers.
 */

export const DEFAULT_MUSHAF_LINES = 15
export const DEFAULT_TOP_MARGIN_RATIO = 0.075 // ~7.5% top decorative header band
export const DEFAULT_BOTTOM_MARGIN_RATIO = 0.055 // ~5.5% bottom footer/border margin

export function calculateMushafLine(
  yRatio: number,
  totalLines = DEFAULT_MUSHAF_LINES,
  topMargin = DEFAULT_TOP_MARGIN_RATIO,
  bottomMargin = DEFAULT_BOTTOM_MARGIN_RATIO,
): number {
  const textHeight = 1 - topMargin - bottomMargin
  if (yRatio <= topMargin) return 1
  if (yRatio >= 1 - bottomMargin) return totalLines

  const normalizedY = (yRatio - topMargin) / textHeight
  const lineIndex = Math.floor(normalizedY * totalLines) + 1
  return Math.max(1, Math.min(totalLines, lineIndex))
}

export function calculateLineBounds(
  line: number,
  totalLines = DEFAULT_MUSHAF_LINES,
  topMargin = DEFAULT_TOP_MARGIN_RATIO,
  bottomMargin = DEFAULT_BOTTOM_MARGIN_RATIO,
): { topPercent: number; heightPercent: number } {
  const textHeight = 1 - topMargin - bottomMargin
  const lineHeight = textHeight / totalLines
  const clampedLine = Math.min(totalLines, Math.max(1, line))
  const topRatio = topMargin + (clampedLine - 1) * lineHeight

  return {
    topPercent: Number((topRatio * 100).toFixed(3)),
    heightPercent: Number((lineHeight * 100).toFixed(3)),
  }
}

