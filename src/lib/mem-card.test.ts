import { describe, expect, it } from "vitest"

import { paletteFor, PALETTES, splitParts, wrapLines } from "./mem-card"

describe("splitParts", () => {
  it("keeps one trimmed part per non-empty line", () => {
    expect(splitParts("  الحمد لله \n\n رب العالمين\r\n")).toEqual(["الحمد لله", "رب العالمين"])
  })
})

describe("paletteFor", () => {
  it("is stable for an id and always one of the palettes", () => {
    expect(paletteFor("abc")).toBe(paletteFor("abc"))
    expect(PALETTES).toContain(paletteFor("another-id"))
  })
})

describe("wrapLines", () => {
  const measure = (s: string) => s.length

  it("wraps at spaces once a line is too wide", () => {
    expect(wrapLines("aa bb cc dd", 5, measure)).toEqual(["aa bb", "cc dd"])
  })

  it("always breaks on newlines and keeps an over-long word whole", () => {
    expect(wrapLines("aaaaaaaa\nb c", 5, measure)).toEqual(["aaaaaaaa", "b c"])
  })
})
