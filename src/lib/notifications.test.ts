import { describe, expect, it } from "vitest"

import {
  DEDUPE_WINDOW_MINUTES,
  dedupeCutoffIso,
  retentionCutoffIso,
  sanitizeSearchTerm,
} from "./notifications"

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

describe("dedupeCutoffIso", () => {
  it("returns the timestamp one window before the given date", () => {
    const cutoff = dedupeCutoffIso(new Date("2026-03-15T12:00:00.000Z"))
    expect(cutoff).toBe(new Date("2026-03-15T11:55:00.000Z").toISOString())
  })

  // A duplicate fired moments after the original must fall inside the window
  // (suppressed); a genuine repeat well after it must fall outside (delivered).
  it("brackets a repeat notification correctly", () => {
    const now = new Date("2026-03-15T12:00:00.000Z")
    const cutoff = dedupeCutoffIso(now)
    const remountSeconds = new Date(now.getTime() - 2_000).toISOString()
    const nextSession = new Date(now.getTime() - (DEDUPE_WINDOW_MINUTES + 1) * 60_000).toISOString()

    expect(remountSeconds >= cutoff).toBe(true)
    expect(nextSession >= cutoff).toBe(false)
  })
})
