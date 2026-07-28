import { describe, expect, it } from "vitest"

import { journeyStops } from "./journey"

describe("journeyStops", () => {
  // The bug: current para on a milestone (e.g. 25) produced a duplicate node,
  // rendering two "You are here" markers.
  it("never duplicates when the current para is a milestone", () => {
    for (const done of [5, 10, 15, 20, 25, 30]) {
      const ns = journeyStops(done)
      expect(new Set(ns).size).toBe(ns.length) // no dupes
      const current = ns.filter((n) => n === done && n !== 30)
      expect(current.length).toBeLessThanOrEqual(1) // ≤1 "You are here"
    }
  })

  it("inserts exactly one current stop for an in-between para", () => {
    const ns = journeyStops(12)
    expect(ns).toEqual([5, 10, 12, 15, 20, 25, 30])
    expect(ns.filter((n) => n === 12)).toHaveLength(1)
  })

  it("stays sorted and always ends at the finish", () => {
    for (const done of [0, 1, 7, 25, 30]) {
      const ns = journeyStops(done)
      expect(ns).toEqual([...ns].sort((a, b) => a - b))
      expect(ns.at(-1)).toBe(30)
    }
  })

  it("adds no current node at the edges (0 = not started, 30 = finished)", () => {
    expect(journeyStops(0)).toEqual([5, 10, 15, 20, 25, 30])
    expect(journeyStops(30)).toEqual([5, 10, 15, 20, 25, 30])
  })
})
