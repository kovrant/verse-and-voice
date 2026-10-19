/**
 * The Noorani Qaida course: ten units of cards, plus the pure helpers the portal needs to walk them.
 *
 * Content is code on purpose (see qaida-draft/IMPLEMENTATION-PLAN.md §1). Card ids are stable slugs that
 * progress rows (`student_qaida_progress.card_id`) and audio rows (`qaida_card_audio.card_id`) key on.
 * `node scripts/qaida-deck-json.mjs` regenerates the review page's JSON from this module.
 */
import type { Card, Deck, ExerciseKind, Unit } from "./types"
import { UNIT_1 } from "./units/u01-letters"
import { UNIT_2 } from "./units/u02-vowels"
import { UNIT_3 } from "./units/u03-joining"
import { UNIT_4 } from "./units/u04-tanween"
import { UNIT_5 } from "./units/u05-madd"
import { UNIT_6 } from "./units/u06-sukoon"
import { UNIT_7 } from "./units/u07-shaddah"
import { UNIT_8 } from "./units/u08-thick-thin"
import { UNIT_9 } from "./units/u09-rules"
import { UNIT_10 } from "./units/u10-quran"

export { HEAVY, LETTER_BY_CHAR, LETTERS, QALQALA } from "./letters"
export * from "./types"

export const EXERCISE_KINDS: Record<ExerciseKind, string> = {
  "spot-the-letter": "Teacher or audio names a letter; child taps it among look-alikes.",
  "odd-one-out": "Four tiles, three identical; child taps the different one.",
  "listen-and-tap": "Audio plays; child taps the matching tile.",
  "speed-round": "Tiles flash one at a time with a timer; child says each; teacher marks.",
  "which-mark": "Child names the vowel mark on the letter.",
  "same-or-different": "Two sounds play; child says whether they are the same.",
  "build-the-sound": "Child picks a letter tile and a mark tile to match the sound heard.",
  "which-letter-is-this": "A middle or end form is shown; child picks the letter.",
  "which-letters-hide": "A joined word is shown; child picks every letter inside it.",
  "blend-it": "Syllable tiles are shuffled; child taps them in order and says the word.",
  "read-aloud": "Child reads; teacher marks each item. Optional recording for parents.",
  "one-or-two": "Single mark or tanween.",
  "find-it": "Child taps the letter carrying the feature named (tanween, madd, sukoon, shaddah).",
  "short-or-long": "Audio; child picks the short or the stretched tile.",
  "same-sound": "Two spellings shown; child says whether they sound the same.",
  "madd-or-leen": "Child classifies the syllable.",
  "bounce-or-not": "Qalqala recognition.",
  "single-or-double": "Shaddah recognition by ear.",
  "hum-or-not": "Ghunna recognition.",
  "thick-or-thin": "Heavy versus light by ear.",
  "ra-thick-or-thin": "Ra rule.",
  "rule-detective": "Word shown; child names the rule inside it.",
  "count-it": "Madd length: 2, 4 or 6.",
  "stop-here": "Child reads the word stopping on it.",
}

export const QAIDA_UNITS: Unit[] = [
  UNIT_1,
  UNIT_2,
  UNIT_3,
  UNIT_4,
  UNIT_5,
  UNIT_6,
  UNIT_7,
  UNIT_8,
  UNIT_9,
  UNIT_10,
]

export const QAIDA_DECK: Deck = {
  title: "Noorani Qaida Course",
  version: "0.3",
  language: "en",
  legend: {
    heavy: "Thick letter (read heavy)",
    qalqala: "Bounces when it has sukoon",
    ghunna: "Hum through the nose",
  },
  exerciseKinds: EXERCISE_KINDS,
  units: QAIDA_UNITS,
}

/** Where a card sits in the course. */
export interface CardLocation {
  card: Card
  unit: Unit
  stepIndex: number
  /** 0-based position inside the unit. */
  index: number
  /** Cards in the unit. */
  total: number
}

const FLAT: CardLocation[] = QAIDA_UNITS.flatMap((unit) => {
  const total = unit.steps.reduce((n, s) => n + s.cards.length, 0)
  let index = 0
  return unit.steps.flatMap((step, stepIndex) =>
    step.cards.map((card) => ({ card, unit, stepIndex, index: index++, total })),
  )
})
const BY_ID = new Map(FLAT.map((loc) => [loc.card.id, loc]))

/** Every card in teaching order, across all units. */
export function allCards(): Card[] {
  return FLAT.map((l) => l.card)
}

export function cardById(id: string): Card | null {
  return BY_ID.get(id)?.card ?? null
}

export function locateCard(id: string): CardLocation | null {
  return BY_ID.get(id) ?? null
}

/** The card before and after `id` in teaching order, crossing unit boundaries. Null at the ends. */
export function adjacentCards(id: string): { prev: Card | null; next: Card | null } {
  const i = FLAT.findIndex((l) => l.card.id === id)
  if (i < 0) return { prev: null, next: null }
  return { prev: FLAT[i - 1]?.card ?? null, next: FLAT[i + 1]?.card ?? null }
}

export function unitByNumber(n: number): Unit | null {
  return QAIDA_UNITS.find((u) => u.number === n) ?? null
}

/** The first card of the course; where a child with no `qaida_card_id` starts. */
export function firstCard(): Card {
  return FLAT[0].card
}

/**
 * Unit 1 is always open. Unit N opens once the check of unit N-1 has been passed
 * (decision 2 in the plan: units unlock after a passed check).
 */
export function unitIsUnlocked(unitNumber: number, passedUnits: ReadonlySet<number>): boolean {
  if (unitNumber <= 1) return true
  return passedUnits.has(unitNumber - 1)
}

/** Cards a child may open for self-practice given which unit checks they have passed. */
export function unlockedCardIds(passedUnits: ReadonlySet<number>): Set<string> {
  return new Set(
    FLAT.filter((l) => unitIsUnlocked(l.unit.number, passedUnits)).map((l) => l.card.id),
  )
}
