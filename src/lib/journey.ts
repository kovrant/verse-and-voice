/**
 * Milestone stops + the student's current para, deduped & ordered — so the
 * dashboard journey path always has exactly one "You are here" even when the
 * current para lands on a milestone (5/10/15/20/25/30) or the final para.
 */
export function journeyStops(done: number, total = 30): number[] {
  const stops = new Set([5, 10, 15, 20, 25, total])
  if (done > 0 && done < total) stops.add(done)
  return [...stops].sort((a, b) => a - b)
}
