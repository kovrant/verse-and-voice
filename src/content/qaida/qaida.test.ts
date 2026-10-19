import { describe, expect, it } from "vitest"

import {
  adjacentCards,
  allCards,
  cardById,
  type ExerciseItem,
  firstCard,
  LETTERS,
  locateCard,
  QAIDA_DECK,
  QAIDA_UNITS,
  unitIsUnlocked,
  unlockedCardIds,
} from "./index"
import { syllableTiles } from "./units/u03-joining"

const cards = allCards()
const exercises = cards.filter((c) => c.type === "exercise")

const sameMultiset = (a: readonly string[], b: readonly string[]) =>
  [...a].sort().join("|") === [...b].sort().join("|")

describe("deck shape", () => {
  it("has ten units numbered in order with non-empty steps", () => {
    expect(QAIDA_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const u of QAIDA_UNITS) {
      expect(u.steps.length).toBeGreaterThan(0)
      for (const s of u.steps) expect(s.cards.length).toBeGreaterThan(0)
    }
  })

  it("ends every unit with its check and then its celebration", () => {
    for (const u of QAIDA_UNITS) {
      const unitCards = u.steps.flatMap((s) => s.cards)
      expect(unitCards.filter((c) => c.type === "check")).toHaveLength(1)
      expect(unitCards.filter((c) => c.type === "celebrate")).toHaveLength(1)
      const last = unitCards.slice(-2)
      expect(last[0].type).toBe("check")
      expect(last[1].type).toBe("celebrate")
      expect(last[0].id).toBe(`u${u.number}.check`)
      expect(last[1].id).toBe(`u${u.number}.celebrate`)
    }
  })

  it("keeps the course short: under 320 cards, with dozens of exercises", () => {
    expect(cards.length).toBeGreaterThan(250)
    expect(cards.length).toBeLessThan(320)
    expect(exercises.length).toBeGreaterThanOrEqual(50)
  })

  it("only the last unit's celebration is the finale", () => {
    const finales = cards.filter((c) => c.type === "celebrate" && c.finale)
    expect(finales.map((c) => c.id)).toEqual(["u10.celebrate"])
  })
})

describe("card ids", () => {
  it("are unique", () => {
    const ids = cards.map((c) => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })

  it("are stable slugs of the form u<n>.<kind>.<slug>", () => {
    for (const c of cards) {
      expect(c.id).toMatch(/^u(10|[1-9])\.[a-z]+(\.[a-z0-9-]+)*$/)
    }
  })

  it("carry their own unit number", () => {
    for (const u of QAIDA_UNITS) {
      for (const c of u.steps.flatMap((s) => s.cards)) {
        expect(c.id.startsWith(`u${u.number}.`)).toBe(true)
      }
    }
  })
})

describe("content", () => {
  it("has a letter card in unit 1 for every letter", () => {
    for (const l of LETTERS) expect(cardById(`u1.letter.${l.key}`)?.type).toBe("letter")
  })

  it("gives every word, ayah, syllable and letter card Arabic, transliteration and an audio key", () => {
    for (const c of cards) {
      if (c.type === "word" || c.type === "ayah" || c.type === "syllable" || c.type === "letter") {
        expect(c.arabic.trim().length, c.id).toBeGreaterThan(0)
        expect(c.translit.trim().length, c.id).toBeGreaterThan(0)
        expect(c.audio, c.id).toMatch(/^[a-z]+\/[^/\s]+$/)
      }
    }
  })

  it("gives every rule a title and body, and every exercise a prompt and items", () => {
    for (const c of cards) {
      if (c.type === "rule") {
        expect(c.title.length, c.id).toBeGreaterThan(0)
        expect(c.body.length, c.id).toBeGreaterThan(20)
      }
      if (c.type === "exercise") {
        expect(c.prompt.length, c.id).toBeGreaterThan(0)
        // The hook family has three letters, so its exercises have three items.
        expect(c.items.length, c.id).toBeGreaterThanOrEqual(3)
        expect(QAIDA_DECK.exerciseKinds[c.kind], c.id).toBeDefined()
      }
    }
  })
})

describe("exercise items are answerable", () => {
  const check = (id: string, item: ExerciseItem) => {
    const { options, tiles, letters, marks, answer } = item
    if (tiles) {
      expect(Array.isArray(answer), id).toBe(true)
      expect(sameMultiset(tiles, answer as string[]), id).toBe(true)
      return
    }
    if (letters && marks) {
      const [l, m] = answer as string[]
      expect(letters, id).toContain(l)
      expect(marks, id).toContain(m)
      return
    }
    if (options && typeof answer === "string") {
      expect(options, id).toContain(answer)
      expect(new Set(options).size === options.length || item.options?.length === 4, id).toBe(true)
    }
    if (options && Array.isArray(answer)) {
      for (const a of answer) expect(options, id).toContain(a)
    }
  }

  it("every answer is among its options or tiles", () => {
    for (const ex of exercises) {
      if (ex.type !== "exercise") continue
      for (const item of ex.items) check(ex.id, item)
    }
  })

  it("every item shows or plays something", () => {
    for (const ex of exercises) {
      if (ex.type !== "exercise") continue
      for (const item of ex.items) {
        // Spot-the-letter names the target in words ("Tap Ba"), so `ask` counts as content,
        // and odd-one-out's four tiles are the content.
        const hasContent = !!(
          item.arabic ||
          item.audio ||
          item.shown ||
          item.ask ||
          (ex.kind === "odd-one-out" && item.options)
        )
        expect(hasContent, ex.id).toBe(true)
      }
    }
  })
})

describe("helpers", () => {
  it("locates a card inside its unit", () => {
    const loc = locateCard("u3.word.kataba")
    expect(loc?.unit.number).toBe(3)
    expect(loc?.card.type).toBe("word")
    expect(loc!.index).toBeGreaterThan(0)
    expect(loc!.index).toBeLessThan(loc!.total)
    expect(locateCard("nope")).toBeNull()
  })

  it("walks across unit boundaries", () => {
    const { next } = adjacentCards("u1.celebrate")
    expect(next?.id.startsWith("u2.")).toBe(true)
    const { prev } = adjacentCards(next!.id)
    expect(prev?.id).toBe("u1.celebrate")
    expect(adjacentCards(firstCard().id).prev).toBeNull()
    expect(adjacentCards("u10.celebrate").next).toBeNull()
    expect(adjacentCards("nope")).toEqual({ prev: null, next: null })
  })

  it("unlocks a unit only after the previous check is passed", () => {
    const none = new Set<number>()
    expect(unitIsUnlocked(1, none)).toBe(true)
    expect(unitIsUnlocked(2, none)).toBe(false)
    expect(unitIsUnlocked(2, new Set([1]))).toBe(true)
    expect(unitIsUnlocked(3, new Set([1]))).toBe(false)
    expect(unitIsUnlocked(3, new Set([2]))).toBe(true)
    const open = unlockedCardIds(new Set([1]))
    expect(open.has("u1.letter.ba")).toBe(true)
    expect(open.has("u2.rule.fatha")).toBe(true)
    expect(open.has("u3.word.kataba")).toBe(false)
  })

  it("splits a vowelled word into syllable tiles", () => {
    expect(syllableTiles("كَتَبَ")).toEqual(["كَ", "تَ", "بَ"])
    expect(syllableTiles("عَلِمَ")).toEqual(["عَ", "لِ", "مَ"])
  })
})
