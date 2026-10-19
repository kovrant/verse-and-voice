/**
 * Noorani Qaida course content types.
 *
 * The course is ten units; each unit is a sequence of steps; each step is a sequence of cards.
 * Cards are what the live class broadcasts, what the child practises, and what progress rows key on,
 * so every card id is a stable slug (`u3.word.kataba`) that never changes once a student has a row.
 * See qaida-draft/IMPLEMENTATION-PLAN.md.
 */

export type ExerciseKind =
  | "spot-the-letter"
  | "odd-one-out"
  | "listen-and-tap"
  | "speed-round"
  | "which-mark"
  | "same-or-different"
  | "build-the-sound"
  | "which-letter-is-this"
  | "which-letters-hide"
  | "blend-it"
  | "read-aloud"
  | "one-or-two"
  | "find-it"
  | "short-or-long"
  | "same-sound"
  | "madd-or-leen"
  | "bounce-or-not"
  | "single-or-double"
  | "hum-or-not"
  | "thick-or-thin"
  | "ra-thick-or-thin"
  | "rule-detective"
  | "count-it"
  | "stop-here"

/** Pronunciation markers. heavy = the book's green letters, qalqala = blue, ghunna = red. */
export interface Marks {
  heavy?: boolean
  qalqala?: boolean
  ghunna?: boolean
}

interface Base {
  id: string
}

export interface RuleCard extends Base {
  type: "rule"
  title: string
  body: string
  /** Arabic shown large above the body. */
  example?: string
  /** Shown only in the teacher's view. */
  teacher?: string
  /** What the child can see in the text that signals this rule. */
  cue?: string
}

export interface FamilyCard extends Base {
  type: "family"
  title: string
  arabic: string
  members: string[]
  body: string
}

export interface LetterCard extends Base, Marks {
  type: "letter"
  arabic: string
  /** Letter key, e.g. "ba". */
  letter: string
  name: string
  nameAr: string
  translit: string
  sound: string
  tip: string
  connects: boolean
  audio: string
}

export interface SyllableCard extends Base, Marks {
  type: "syllable"
  arabic: string
  translit: string
  label: string
  audio: string
}

export interface DrillItem extends Marks {
  arabic: string
  translit: string
  audio: string
}

export interface DrillCard extends Base {
  type: "drill"
  title: string
  hint?: string
  items: DrillItem[]
}

export interface ShapesCard extends Base {
  type: "shapes"
  arabic: string
  name: string
  forms: { isolated: string; initial: string; medial: string; final: string }
  body: string
}

export interface WordCard extends Base, Marks {
  type: "word"
  arabic: string
  translit: string
  note: string | null
  audio: string
}

export interface AyahCard extends Base, Marks {
  type: "ayah"
  sura: string
  number: number
  arabic: string
  translit: string
  /** Rules the child has learned that appear in this ayah. */
  rules: string[]
  audio: string
}

/**
 * One item of an exercise. Which fields are present depends on the kind:
 * - options + answer (string): tap one of the options
 * - options + answer (string[]): tap every answer among the options
 * - tiles + answer (string[]): tap the tiles in this order
 * - letters + marks + answer [letter, mark]: build a syllable
 * - audio: what plays; shown: Arabic displayed instead of a single arabic string
 */
export interface ExerciseItem {
  arabic?: string
  translit?: string
  audio?: string | string[]
  shown?: string[]
  ask?: string
  options?: string[]
  tiles?: string[]
  letters?: string[]
  marks?: string[]
  answer?: string | string[]
}

export interface ExerciseCard extends Base {
  type: "exercise"
  kind: ExerciseKind
  prompt: string
  items: ExerciseItem[]
  /** Speed rounds: seconds per item. */
  seconds?: number
}

export interface CheckItem {
  kind: ExerciseKind | "say-it"
  count: number
  from?: string
}

export interface CheckCard extends Base {
  type: "check"
  title: string
  items: CheckItem[]
  /** Human-readable pass line, e.g. "20 of 24". */
  pass: string
  body: string
}

export interface CelebrateCard extends Base {
  type: "celebrate"
  title: string
  confetti: true
  stars: number
  finale?: boolean
}

export type Card =
  | RuleCard
  | FamilyCard
  | LetterCard
  | SyllableCard
  | DrillCard
  | ShapesCard
  | WordCard
  | AyahCard
  | ExerciseCard
  | CheckCard
  | CelebrateCard

export type CardType = Card["type"]

export interface Step {
  title: string
  cards: Card[]
}

export interface Unit {
  number: number
  slug: string
  title: string
  goal: string
  /** Why the unit is shaped this way; shown to the teacher. */
  why: string
  steps: Step[]
}

export interface Deck {
  title: string
  version: string
  language: "en"
  legend: Record<"heavy" | "qalqala" | "ghunna", string>
  exerciseKinds: Record<ExerciseKind, string>
  units: Unit[]
}
