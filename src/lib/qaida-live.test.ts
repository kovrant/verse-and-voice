import { describe, expect, it } from "vitest"

import { allCards, cardAt, cardById, firstCard } from "@/content/qaida"

import {
  cardAudioKeys,
  cardPage,
  cardTiles,
  parseQaidaMessage,
  startingCard,
  tileAudioKey,
} from "./qaida-live"

describe("parseQaidaMessage", () => {
  it("accepts the three phase-2 kinds", () => {
    expect(parseQaidaMessage({ kind: "reveal", hint: false })).toEqual({
      kind: "reveal",
      hint: false,
    })
    expect(parseQaidaMessage({ kind: "play", key: "syl/ba-a", by: "x" })).toEqual({
      kind: "play",
      key: "syl/ba-a",
    })
    expect(parseQaidaMessage({ kind: "highlight", tile: 2 })).toEqual({
      kind: "highlight",
      tile: 2,
    })
    expect(parseQaidaMessage({ kind: "highlight", tile: null })).toEqual({
      kind: "highlight",
      tile: null,
    })
  })

  it("rejects malformed payloads", () => {
    for (const bad of [
      null,
      "reveal",
      {},
      { kind: "reveal" },
      { kind: "play", key: "" },
      { kind: "highlight", tile: -1 },
      { kind: "highlight", tile: 1.5 },
      { kind: "celebrate" },
    ]) {
      expect(parseQaidaMessage(bad)).toBeNull()
    }
  })
})

describe("positions", () => {
  it("starts on the saved card, or the first card when it is missing or unknown", () => {
    expect(startingCard("u3.word.kataba").id).toBe("u3.word.kataba")
    expect(startingCard(null).id).toBe(firstCard().id)
    expect(startingCard("u99.gone").id).toBe(firstCard().id)
  })

  it("maps a card to a 1-based course page and back", () => {
    expect(cardPage(firstCard().id)).toBe(1)
    const id = "u3.word.kataba"
    expect(cardAt(cardPage(id) - 1)?.id).toBe(id)
    expect(cardPage("u10.celebrate")).toBe(allCards().length)
  })
})

describe("tiles and audio", () => {
  it("gives every card type a sensible tile list", () => {
    expect(cardTiles(cardById("u1.family.boat")!)).toEqual(["ب", "ت", "ث", "ن", "ي"])
    expect(cardTiles(cardById("u3.shapes.ba")!)).toHaveLength(4)
    expect(cardTiles(cardById("u1.letter.ba")!)).toEqual(["ب"])
    expect(cardTiles(cardById("u10.ayah.fatiha.1")!)).toHaveLength(4)
    expect(cardTiles(cardById("u1.celebrate")!)).toEqual([])
  })

  it("never splits a word: tiles joined by spaces give back the text", () => {
    const w = cardById("u8.word.bismillaahi")!
    expect(w.type).toBe("word")
    if (w.type === "word") expect(cardTiles(w).join(" ")).toBe(w.arabic)
  })

  it("maps drill tiles onto their clips", () => {
    const drill = cardById("u2.drill.fatha")!
    const keys = cardAudioKeys(drill)
    expect(keys.length).toBe(cardTiles(drill).length)
    expect(tileAudioKey(drill, 0)).toBe(keys[0])
    expect(tileAudioKey(cardById("u1.letter.ba")!, 0)).toBe("letters/ba")
    expect(tileAudioKey(cardById("u1.letter.ba")!, 1)).toBeNull()
    expect(tileAudioKey(cardById("u1.family.boat")!, 0)).toBeNull()
  })
})
