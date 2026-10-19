import { describe, expect, it } from "vitest"

import { allCards } from "@/content/qaida"

import {
  audioProgress,
  collectAudioKeys,
  nextMissingKey,
  qaidaAudioObjectName,
  qaidaAudioPath,
} from "./qaida-course"

const keys = collectAudioKeys()

describe("collectAudioKeys", () => {
  it("collects every audio key once, with Arabic to show while recording", () => {
    const ids = keys.map((k) => k.key)
    expect(new Set(ids).size).toBe(ids.length)
    for (const k of keys) {
      expect(k.key, k.key).toMatch(/^(letters|syl|words|quran)\/[a-z0-9-]+$/)
      expect(k.arabic.length, k.key).toBeGreaterThan(0)
      expect(k.cardIds.length, k.key).toBeGreaterThan(0)
    }
  })

  it("shares one clip between a syllable card, its drill grid and its exercises", () => {
    const ba = keys.find((k) => k.key === "syl/ba-a")
    expect(ba?.arabic).toBe("بَ")
    expect(ba?.translit).toBe("ba")
    expect(ba!.cardIds.length).toBeGreaterThan(1)
    expect(ba?.unit).toBe(2)
  })

  it("is sized for a teacher to record: a few hundred clips, letters and syllables first", () => {
    expect(keys.length).toBeGreaterThan(250)
    expect(keys.length).toBeLessThan(450)
    expect(keys[0].group).toBe("letters")
    expect(keys.filter((k) => k.unit <= 2).length).toBeLessThan(140)
  })

  it("accepts a subset of cards", () => {
    const unit1 = allCards().filter((c) => c.id.startsWith("u1."))
    expect(collectAudioKeys(unit1).every((k) => k.group === "letters")).toBe(true)
  })
})

describe("audioProgress and nextMissingKey", () => {
  const rows = [{ audio_key: keys[0].key }, { audio_key: keys[2].key }]

  it("counts recorded keys overall and per group", () => {
    const p = audioProgress(keys, rows)
    expect(p.total).toBe(keys.length)
    expect(p.done).toBe(2)
    expect(p.groups.letters.done).toBe(2)
    expect(audioProgress(keys, []).done).toBe(0)
  })

  it("finds the next unrecorded key, wrapping around", () => {
    expect(nextMissingKey(keys, rows)?.key).toBe(keys[1].key)
    expect(nextMissingKey(keys, rows, 2)?.key).toBe(keys[3].key)
    expect(nextMissingKey(keys, rows, keys.length - 1)?.key).toBe(keys[keys.length - 1].key)
    expect(nextMissingKey(keys.slice(0, 1), rows)).toBeNull()
  })
})

describe("storage helpers", () => {
  it("names objects from the key without slashes and never reuses a name", () => {
    expect(qaidaAudioObjectName("syl/ba-a", "webm", 1000)).toBe("syl-ba-a-rs.webm")
    expect(qaidaAudioObjectName("syl/ba-a", "webm", 1000)).not.toBe(
      qaidaAudioObjectName("syl/ba-a", "webm", 1001),
    )
  })

  it("extracts the object path from a public URL in the bucket only", () => {
    expect(
      qaidaAudioPath("https://x.supabase.co/storage/v1/object/public/qaida-audio/syl-ba-a-rs.webm"),
    ).toBe("syl-ba-a-rs.webm")
    expect(qaidaAudioPath("https://x.supabase.co/storage/v1/object/public/media/a.pdf")).toBeNull()
    expect(qaidaAudioPath(null)).toBeNull()
  })
})
