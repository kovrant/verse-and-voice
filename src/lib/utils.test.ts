import { describe, expect, it } from "vitest"

import { formatLocalDate, parseLocalDate } from "./utils"

// Bug 15 — date-only strings must be parsed/formatted in LOCAL time, not UTC.
describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD as a local calendar date (no UTC shift)", () => {
    const d = parseLocalDate("2024-03-10")!
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(2) // March (0-indexed)
    expect(d.getDate()).toBe(10) // never the 9th, regardless of timezone
  })

  it("returns null for empty / nullish input", () => {
    expect(parseLocalDate("")).toBeNull()
    expect(parseLocalDate(null)).toBeNull()
    expect(parseLocalDate(undefined)).toBeNull()
  })

  it("falls back to Date for full datetime strings", () => {
    const d = parseLocalDate("2024-03-10T08:30:00Z")
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d!.getTime())).toBe(false)
  })

  it("returns null for unparseable input", () => {
    expect(parseLocalDate("not-a-date")).toBeNull()
  })
})

describe("formatLocalDate", () => {
  it("formats a Date as local YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2024, 0, 5))).toBe("2024-01-05")
    expect(formatLocalDate(new Date(2025, 11, 31))).toBe("2025-12-31")
  })

  it("round-trips with parseLocalDate", () => {
    expect(formatLocalDate(parseLocalDate("2025-12-31")!)).toBe("2025-12-31")
    expect(formatLocalDate(parseLocalDate("2024-02-29")!)).toBe("2024-02-29")
  })
})
