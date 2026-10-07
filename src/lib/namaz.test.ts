import { describe, expect, it } from "vitest"

import {
  activeWordIndex,
  evenWordTimings,
  findStop,
  flattenNamaz,
  namazAudioPath,
  namazAudioType,
  type NamazStep,
  type NamazStepPart,
  partsForStep,
  stepSlug,
  stopKey,
  validWordTimings,
  wordChips,
} from "./namaz"

const step = (id: string, title: string, order_index: number): NamazStep => ({
  id,
  title,
  order_index,
  image_url: null,
  card_color: "#000",
})

const part = (id: string, step_id: string, order_index: number): NamazStepPart => ({
  id,
  step_id,
  title: id,
  order_index,
  image_url: null,
  arabic_text: null,
  translation: null,
  action_text: null,
  word_tr: null,
  repeat_count: null,
  audio_url: null,
  word_timings: null,
  needs_review: false,
  review_note: null,
})

const steps = [step("q", "Qiyam", 1), step("t", "Takbir", 0), step("s2", "Second Sujood", 2)]
const parts = [part("fatiha", "q", 1), part("takbir", "t", 0), part("sana", "q", 0)]

describe("partsForStep", () => {
  it("keeps one step's parts, in order", () => {
    expect(partsForStep("q", parts).map((p) => p.id)).toEqual(["sana", "fatiha"])
  })
})

describe("flattenNamaz", () => {
  it("runs every part of every step in prayer order", () => {
    const stops = flattenNamaz(steps, parts)
    expect(stops.map((s) => s.part?.id ?? s.step.id)).toEqual(["takbir", "sana", "fatiha", "s2"])
    expect(stops[2]).toMatchObject({ stepIndex: 1, partIndex: 1, partCount: 2 })
  })

  it("gives a step with no parts one screen", () => {
    expect(flattenNamaz(steps, parts)[3]).toMatchObject({ part: null, partCount: 1, stepIndex: 2 })
  })

  it("keys a screen by its part, or its step when it has none", () => {
    expect(flattenNamaz(steps, parts).map(stopKey)).toEqual(["takbir", "sana", "fatiha", "s2"])
  })
})

describe("stepSlug / findStop", () => {
  const stops = flattenNamaz(steps, parts)

  it("slugs titles", () => {
    expect(stepSlug("Second Sujood")).toBe("second-sujood")
  })

  it("finds a step and a 1-based part, clamping the part", () => {
    expect(findStop(stops, "qiyam")).toBe(1)
    expect(findStop(stops, "qiyam", 2)).toBe(2)
    expect(findStop(stops, "qiyam", 9)).toBe(2)
    expect(findStop(stops, "nope")).toBe(-1)
  })
})

describe("wordChips", () => {
  it("pairs words and keeps the ayah marker on the word before it", () => {
    const arabic = "الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ"
    const chips = wordChips(arabic, ["Ar-Rahmanir-", "Rahim", "Maliki"])
    expect(chips?.map((c) => c.ar)).toEqual(["الرَّحْمَٰنِ", "الرَّحِيمِ ۝", "مَالِكِ"])
    expect(chips?.map((c) => c.ar).join(" ")).toBe(arabic)
  })

  it("returns null when the counts disagree or data is missing", () => {
    expect(wordChips("سُبْحَانَ رَبِّيَ", ["Subhana"])).toBeNull()
    expect(wordChips(null, ["x"])).toBeNull()
    expect(wordChips("x", null)).toBeNull()
  })
})

describe("word timings", () => {
  it("spreads words evenly over the audio", () => {
    expect(evenWordTimings(4, 2)).toEqual([0, 0.5, 1, 1.5])
    expect(evenWordTimings(3, 0)).toEqual([])
  })

  it("finds the word playing now", () => {
    const t = [0, 0.5, 1]
    expect(activeWordIndex(t, -0.1)).toBe(-1)
    expect(activeWordIndex(t, 0.7)).toBe(1)
    expect(activeWordIndex(t, 5)).toBe(2)
  })
})

describe("namaz audio", () => {
  it("drops codecs and maps types to extensions", () => {
    expect(namazAudioType("audio/webm;codecs=opus")).toEqual({ type: "audio/webm", ext: "webm" })
    expect(namazAudioType("audio/x-m4a")).toEqual({ type: "audio/x-m4a", ext: "m4a" })
    expect(namazAudioType("", "sana.MP3")).toEqual({ type: "audio/mpeg", ext: "mp3" })
    expect(namazAudioType("video/mp4", "clip.mov")).toBeNull()
  })

  it("finds the bucket path in a public URL", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/namaz-audio/abc-1.webm?t=1"
    expect(namazAudioPath(url)).toBe("abc-1.webm")
    expect(namazAudioPath("https://x.supabase.co/storage/v1/object/public/media/a.mp3")).toBeNull()
    expect(namazAudioPath(null)).toBeNull()
  })

  it("accepts only one non-decreasing timing per word", () => {
    expect(validWordTimings([0, 0.4, 0.9], 3)).toBe(true)
    expect(validWordTimings([0, 0.9, 0.4], 3)).toBe(false)
    expect(validWordTimings([0, 0.4], 3)).toBe(false)
    expect(validWordTimings(null, 3)).toBe(false)
  })
})
