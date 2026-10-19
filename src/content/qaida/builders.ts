/**
 * Small factories shared by the unit files. They own the id scheme:
 *   u<unit>.<kind>.<slug>   e.g. u3.word.kataba, u1.ex.spot.boat, u10.ayah.fatiha.1
 * Ids are stable: progress rows and audio rows key on them. Never renumber; add new slugs instead.
 */
import { GHUNNA, HEAVY, LETTER_BY_CHAR, QALQALA } from "./letters"
import type {
  AyahCard,
  CelebrateCard,
  CheckCard,
  CheckItem,
  DrillCard,
  DrillItem,
  ExerciseCard,
  ExerciseItem,
  ExerciseKind,
  Marks,
  RuleCard,
  SyllableCard,
  WordCard,
} from "./types"

// Harakat and other marks as code points, so the source stays readable.
export const FATHA = "َ"
export const KASRA = "ِ"
export const DAMMA = "ُ"
export const FATHATAN = "ً"
export const KASRATAN = "ٍ"
export const DAMMATAN = "ٌ"
export const SUKOON = "ْ"
export const SHADDA = "ّ"
export const KHARI_FATHA = "ٰ"
export const KHARI_KASRA = "ٖ"
export const ULTA_DAMMA = "ٗ"
export const TATWEEL = "ـ"

/** Kid transliteration of a short vowel mark. */
export const VOWEL_TR: Record<string, string> = {
  [FATHA]: "a",
  [KASRA]: "i",
  [DAMMA]: "u",
  [FATHATAN]: "an",
  [KASRATAN]: "in",
  [DAMMATAN]: "un",
}

/** Consonant transliteration; Alif carries the vowel so it reads as a hamza stop. */
export const cons = (ch: string): string => {
  const l = LETTER_BY_CHAR[ch]
  return l.tr === "a" ? "'" : l.tr
}

export const letterName = (ch: string): string => LETTER_BY_CHAR[ch].name
export const letterKey = (ch: string): string => LETTER_BY_CHAR[ch].key

export const marksOf = (ch: string): Marks => ({
  heavy: HEAVY.includes(ch),
  qalqala: QALQALA.includes(ch),
  ghunna: GHUNNA.includes(ch),
})

export const wordMarks = (arabic: string): Marks => ({
  heavy: [...arabic].some((c) => HEAVY.includes(c)),
})

/** "al-Hamdu" → "alhamdu". Used for word ids and audio paths. */
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Deterministic shuffle so the content is identical on every build. */
export function shuffle<T>(a: readonly T[], seed: number): T[] {
  const out = [...a]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const id = (unit: number, kind: string, ...parts: string[]): string =>
  [`u${unit}`, kind, ...parts].join(".")

export function rule(
  unit: number,
  key: string,
  title: string,
  body: string,
  extra: Partial<Pick<RuleCard, "example" | "teacher" | "cue">> = {},
): RuleCard {
  return { id: id(unit, "rule", key), type: "rule", title, body, ...extra }
}

export function syllable(
  unit: number,
  key: string,
  arabic: string,
  translit: string,
  label: string,
  baseLetter: string,
  audio = `syl/${slug(translit)}`,
): SyllableCard {
  return {
    id: id(unit, "syl", key),
    type: "syllable",
    arabic,
    translit,
    label,
    ...marksOf(baseLetter),
    audio,
  }
}

/** A letter with one short-vowel mark, e.g. بَ. */
export function vowelSyllable(unit: number, ch: string, mark: string, label: string): SyllableCard {
  const tr = cons(ch) + VOWEL_TR[mark]
  const arabic = ch + mark + (mark === FATHATAN ? "ا" : "")
  return syllable(
    unit,
    `${letterKey(ch)}.${VOWEL_TR[mark]}`,
    arabic,
    tr,
    label,
    ch,
    `syl/${letterKey(ch)}-${VOWEL_TR[mark]}`,
  )
}

export const drillItem = (
  ch: string,
  arabic: string,
  translit: string,
  audio: string,
): DrillItem => ({
  arabic,
  translit,
  audio,
  ...marksOf(ch),
})

export function drill(
  unit: number,
  key: string,
  title: string,
  items: DrillItem[],
  hint?: string,
): DrillCard {
  return { id: id(unit, "drill", key), type: "drill", title, items, ...(hint ? { hint } : {}) }
}

export function word(
  unit: number,
  arabic: string,
  translit: string,
  note: string | null = null,
): WordCard {
  return {
    id: id(unit, "word", slug(translit)),
    type: "word",
    arabic,
    translit,
    note,
    ...wordMarks(arabic),
    audio: `words/${slug(translit)}`,
  }
}

export function ayah(
  unit: number,
  sura: string,
  number: number,
  arabic: string,
  translit: string,
  rules: string[],
): AyahCard {
  return {
    id: id(unit, "ayah", sura, String(number)),
    type: "ayah",
    sura,
    number,
    arabic,
    translit,
    rules,
    ...wordMarks(arabic),
    audio: `quran/${sura}-${number}`,
  }
}

export function exercise(
  unit: number,
  key: string,
  kind: ExerciseKind,
  prompt: string,
  items: ExerciseItem[],
  extra: Partial<Pick<ExerciseCard, "seconds">> = {},
): ExerciseCard {
  return { id: id(unit, "ex", key), type: "exercise", kind, prompt, items, ...extra }
}

export function check(unit: number, title: string, items: CheckItem[], pass: string): CheckCard {
  return {
    id: id(unit, "check"),
    type: "check",
    title,
    items,
    pass,
    body: "The teacher runs this. Every item is a quick tap or a read-aloud. Pass unlocks the celebration and the next unit.",
  }
}

export function celebrate(
  unit: number,
  title: string,
  stars = 1,
  extra: Partial<Pick<CelebrateCard, "finale">> = {},
): CelebrateCard {
  return { id: id(unit, "celebrate"), type: "celebrate", title, confetti: true, stars, ...extra }
}

/** [arabic, transliteration, note] rows used by the word-heavy units. */
export type WordRow = readonly [string, string, string?]

export const words = (unit: number, rows: readonly WordRow[]): WordCard[] =>
  rows.map(([ar, tr, note]) => word(unit, ar, tr, note ?? null))

export const readAloud = (unit: number, key: string, prompt: string, rows: readonly WordRow[]) =>
  exercise(
    unit,
    key,
    "read-aloud",
    prompt,
    rows.map(([ar, tr]) => ({ arabic: ar, translit: tr })),
  )
