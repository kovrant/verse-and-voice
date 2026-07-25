import { describe, expect, it } from "vitest"

import { retentionCutoffIso, sanitizeSearchTerm } from "./notifications"

describe("sanitizeSearchTerm", () => {
  it("removes characters that break PostgREST .or() ilike filters", () => {
    expect(sanitizeSearchTerm("fee, 50% (urgent)")).toBe("fee 50 urgent")
    expect(sanitizeSearchTerm("hello_world")).toBe("hello world")
  })

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  a   b  ")).toBe("a b")
    expect(sanitizeSearchTerm("")).toBe("")
  })
})

describe("retentionCutoffIso", () => {
  it("returns the timestamp exactly two months before the given date", () => {
    const cutoff = retentionCutoffIso(new Date("2026-03-15T12:00:00.000Z"))
    expect(cutoff).toBe(new Date("2026-01-15T12:00:00.000Z").toISOString())
  })
})
