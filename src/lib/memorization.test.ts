import { describe, expect, it } from "vitest"

import { chunkProgress, currentChunkIndex, labelFor, type MemChunk } from "@/lib/memorization"

function chunk(p: Partial<MemChunk>): MemChunk {
  return {
    id: Math.random().toString(36).slice(2),
    catalog_id: "c1",
    order_index: 0,
    label: null,
    image_url: "https://example.com/x.png",
    ...p,
  }
}

describe("labelFor", () => {
  it("auto-numbers as 'Part N' (1-indexed) when no custom label", () => {
    expect(labelFor(chunk({}), 0)).toBe("Part 1")
    expect(labelFor(chunk({}), 4)).toBe("Part 5")
  })

  it("prefers a non-empty custom label, ignoring whitespace-only", () => {
    expect(labelFor(chunk({ label: "First 2 words" }), 0)).toBe("First 2 words")
    expect(labelFor(chunk({ label: "   " }), 2)).toBe("Part 3")
  })
})

describe("chunkProgress", () => {
  it("an item with no parts is never auto-memorized (teacher-driven)", () => {
    expect(chunkProgress([], new Set())).toEqual({ done: 0, total: 0, isMemorized: false })
  })

  it("is memorizing until the LAST part is done", () => {
    const a = chunk({ id: "a" })
    const b = chunk({ id: "b" })
    const c = chunk({ id: "c" })
    const chunks = [a, b, c]

    expect(chunkProgress(chunks, new Set(["a", "b"]))).toEqual({
      done: 2,
      total: 3,
      isMemorized: false,
    })
    expect(chunkProgress(chunks, new Set(["a", "b", "c"]))).toEqual({
      done: 3,
      total: 3,
      isMemorized: true,
    })
  })

  it("only counts parts that belong to this item", () => {
    const a = chunk({ id: "a" })
    const b = chunk({ id: "b" })
    // "z" is some other item's memorized part — must not inflate the count.
    expect(chunkProgress([a, b], new Set(["a", "z"]))).toEqual({
      done: 1,
      total: 2,
      isMemorized: false,
    })
  })
})

describe("currentChunkIndex", () => {
  it("returns -1 when there are no parts", () => {
    expect(currentChunkIndex([], new Set())).toBe(-1)
  })

  it("points at the first unmemorized part", () => {
    const a = chunk({ id: "a" })
    const b = chunk({ id: "b" })
    const c = chunk({ id: "c" })
    expect(currentChunkIndex([a, b, c], new Set())).toBe(0)
    expect(currentChunkIndex([a, b, c], new Set(["a"]))).toBe(1)
    expect(currentChunkIndex([a, b, c], new Set(["a", "b"]))).toBe(2)
  })

  it("returns -1 when every part is memorized", () => {
    const a = chunk({ id: "a" })
    const b = chunk({ id: "b" })
    expect(currentChunkIndex([a, b], new Set(["a", "b"]))).toBe(-1)
  })
})
