import { describe, expect, it } from "vitest"

import { ratioFromScrollTop, scrollTopFromRatio } from "./scroll-sync"

describe("scroll-sync ratio math", () => {
  it("round-trips a position across different zoom levels", () => {
    // Teacher: tall page (zoomed in), scrolled halfway.
    const ratio = ratioFromScrollTop(600, 1600, 400) // (1600-400)=1200 max → 0.5
    expect(ratio).toBe(0.5)
    // Student: shorter page (fit width) lands at the same relative spot.
    expect(scrollTopFromRatio(ratio, 900, 500)).toBe(200) // 0.5 * (900-500)
  })

  it("treats a non-scrollable page as top (avoids divide-by-zero)", () => {
    expect(ratioFromScrollTop(0, 400, 400)).toBe(0)
    expect(scrollTopFromRatio(0.7, 400, 400)).toBe(0)
  })

  it("clamps out-of-range input", () => {
    expect(ratioFromScrollTop(9999, 1000, 400)).toBe(1)
    expect(scrollTopFromRatio(-1, 1000, 400)).toBe(0)
    expect(scrollTopFromRatio(2, 1000, 400)).toBe(600)
  })
})
