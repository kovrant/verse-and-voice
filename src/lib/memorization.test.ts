import { describe, expect, it } from "vitest"

import {
  CATALOG_SELECT,
  type CatalogItem,
  type CelebratedState,
  chunkProgress,
  currentChunkIndex,
  labelFor,
  MEM_ITEM_SELECT,
  type MemChunk,
  type MemItem,
  pendingCelebrations,
  STUDENT_MEM_SELECT,
} from "@/lib/memorization"

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

// The selects and the interfaces have to agree: a field the type declares but
// the select omits is `undefined` at runtime while TypeScript swears it's there.
// These Records are keyed by the interfaces themselves, so adding a field to
// CatalogItem or MemItem stops this file compiling until it's listed — and then
// the assertions below fail until it's in the select string too.
const CATALOG_FIELDS: Record<keyof CatalogItem, true> = {
  id: true,
  title: true,
  category: true,
  image_url: true,
}

const MEM_ITEM_FIELDS: Record<keyof MemItem, true> = {
  id: true,
  status: true,
  last_revised_at: true,
  memorization_catalog: true,
}

describe("select strings", () => {
  it("CATALOG_SELECT requests every field CatalogItem declares", () => {
    for (const field of Object.keys(CATALOG_FIELDS)) {
      expect(CATALOG_SELECT).toContain(field)
    }
  })

  it("MEM_ITEM_SELECT requests every scalar field MemItem declares", () => {
    for (const field of Object.keys(MEM_ITEM_FIELDS)) {
      expect(MEM_ITEM_SELECT).toContain(field)
    }
  })

  it("embeds the catalog in both row selects", () => {
    expect(MEM_ITEM_SELECT).toContain(CATALOG_SELECT)
    expect(STUDENT_MEM_SELECT).toContain(CATALOG_SELECT)
  })

  // MemItem is StudentMemItem minus catalog_id, so its select must not ask for
  // it; the full row gets catalog_id from the leading `*`.
  it("only the full row select supplies catalog_id", () => {
    expect(MEM_ITEM_SELECT).not.toContain("catalog_id")
    expect(STUDENT_MEM_SELECT.startsWith("*,")).toBe(true)
  })
})

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

const ref = (chunkId: string, catalogId = "surah-a") => ({ chunkId, catalogId })
const seen = (chunkIds: string[], lessonIds: string[] = []): CelebratedState => ({
  chunkIds,
  lessonIds,
})

describe("pendingCelebrations", () => {
  it("celebrates nothing on a student's first ever visit, but records the baseline", () => {
    const r = pendingCelebrations([ref("c1"), ref("c2")], [], null)
    expect(r.chunkIds).toEqual([])
    expect(r.lessonIds).toEqual([])
    expect(r.next.chunkIds).toEqual(["c1", "c2"])
  })

  it("celebrates only parts earned since the last visit", () => {
    const r = pendingCelebrations([ref("c1"), ref("c2"), ref("c3")], [], seen(["c1"]))
    expect(r.chunkIds).toEqual(["c2", "c3"])
  })

  it("celebrates nothing when nothing changed", () => {
    const r = pendingCelebrations([ref("c1"), ref("c2")], [], seen(["c1", "c2"]))
    expect(r.chunkIds).toEqual([])
    expect(r.lessonIds).toEqual([])
  })

  it("lets a finished lesson swallow the part that finished it", () => {
    const r = pendingCelebrations([ref("c1"), ref("c2")], ["surah-a"], seen(["c1"]))
    expect(r.lessonIds).toEqual(["surah-a"])
    // c2 completed the lesson, so it must not also fire its own part win.
    expect(r.chunkIds).toEqual([])
  })

  it("still celebrates parts of other lessons alongside a finished one", () => {
    const r = pendingCelebrations(
      [ref("c1"), ref("c2"), ref("d1", "surah-b")],
      ["surah-a"],
      seen(["c1"]),
    )
    expect(r.lessonIds).toEqual(["surah-a"])
    expect(r.chunkIds).toEqual(["d1"])
  })

  it("does not re-celebrate a lesson that was already celebrated", () => {
    const r = pendingCelebrations([ref("c1")], ["surah-a"], seen(["c1"], ["surah-a"]))
    expect(r.lessonIds).toEqual([])
  })

  it("forgets a part the teacher undid, so re-earning it celebrates again", () => {
    // Teacher undoes c2: it drops out of the record...
    const undone = pendingCelebrations([ref("c1")], [], seen(["c1", "c2"]))
    expect(undone.next.chunkIds).toEqual(["c1"])
    // ...so when the student earns it back, it counts as new.
    const reearned = pendingCelebrations([ref("c1"), ref("c2")], [], undone.next)
    expect(reearned.chunkIds).toEqual(["c2"])
  })
})
