import {
  celebrate,
  check,
  cons,
  DAMMA,
  DAMMATAN,
  drill,
  drillItem,
  exercise,
  FATHA,
  FATHATAN,
  KASRA,
  KASRATAN,
  letterKey,
  readAloud,
  rule,
  shuffle,
  VOWEL_TR,
  vowelSyllable,
  type WordRow,
  words,
} from "../builders"
import { SPEAKERS } from "../letters"
import type { Unit } from "../types"

const U = 4
const TAN = [FATHATAN, KASRATAN, DAMMATAN]
const SHORT = [FATHA, KASRA, DAMMA]
const withAlif = (ch: string, m: string) => ch + m + (m === FATHATAN ? "ا" : "")

const WORDS: WordRow[] = [
  ["أَحَدٌ", "aHadun", "One. You will meet it in Surah Al-Ikhlas."],
  ["كُتُبٌ", "kutubun", "Books."],
  ["وَلَدٌ", "waladun", "A boy."],
  ["لَهَبٍ", "lahabin", "Flame."],
  ["طَبَقٍ", "Tabaqin", "Stage. Gold letter at the front."],
  ["عِنَبًا", "'inaban", 'Grapes. Two fathas with the Alif, read "an", not "aa".'],
  ["أَبَدًا", "abadan", "Forever."],
  ["هُدًى", "hudan", "Guidance. The dotless Ya carries the tanween here."],
]

function build(): Unit {
  return {
    number: U,
    slug: "tanween",
    title: "The hidden Noon",
    goal: 'Read tanween as "an / in / un" without stretching the Alif.',
    why: "One rule, eight words, three exercises. Tanween before Noon and Meem (ghunna) waits for Unit 9, when the child can already hear it.",
    steps: [
      {
        title: "Teach",
        cards: [
          rule(
            U,
            "tanween",
            "Two marks means a hidden Noon",
            'When a mark is doubled it is called tanween. It adds an "n" sound at the end: "an", "in", "un". Double fatha usually has an Alif written after it, but the Alif is not stretched.',
            {
              example: "بًا بٍ بٌ",
              teacher:
                'Ask: "where is the n coming from?" and "why is the Alif not long?" Children who can answer these have the rule.',
            },
          ),
          vowelSyllable(U, "ب", FATHATAN, "tanween fatha"),
          vowelSyllable(U, "ب", KASRATAN, "tanween kasra"),
          vowelSyllable(U, "ب", DAMMATAN, "tanween damma"),
          drill(
            U,
            "tanween",
            "Every letter with tanween",
            SPEAKERS.filter((_, i) => i % 3 === 0).flatMap((ch) =>
              TAN.map((m) =>
                drillItem(
                  ch,
                  withAlif(ch, m),
                  cons(ch) + VOWEL_TR[m],
                  `syl/${letterKey(ch)}-${VOWEL_TR[m]}`,
                ),
              ),
            ),
            "Only a sample. The rule is the same for every letter.",
          ),
        ],
      },
      {
        title: "Try",
        cards: [
          exercise(
            U,
            "one-or-two",
            "one-or-two",
            'One mark or two? Tap "short" or "with n".',
            shuffle(SPEAKERS, 4)
              .slice(0, 10)
              .map((ch, i) => {
                const two = i % 2 === 0
                const m = two ? TAN[i % 3] : SHORT[i % 3]
                return {
                  arabic: withAlif(ch, m),
                  options: ["short", "with n"],
                  answer: two ? "with n" : "short",
                }
              }),
          ),
          exercise(
            U,
            "listen",
            "listen-and-tap",
            'Listen. Was it "an", "in" or "un"?',
            shuffle(SPEAKERS, 14)
              .slice(0, 8)
              .map((ch, i) => {
                const m = TAN[i % 3]
                return {
                  audio: `syl/${letterKey(ch)}-${VOWEL_TR[m]}`,
                  options: TAN.map((t) => withAlif(ch, t)),
                  answer: withAlif(ch, m),
                }
              }),
          ),
          ...words(U, WORDS),
          exercise(
            U,
            "find-it",
            "find-it",
            "Tap the letter that carries the tanween.",
            WORDS.map(([ar, tr]) => ({ arabic: ar, translit: tr, answer: "last letter" })),
          ),
          readAloud(U, "read-aloud", 'Read these to your teacher. Make the "n" clear.', WORDS),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Can you hear the hidden Noon?",
            [
              { kind: "one-or-two", count: 6 },
              { kind: "listen-and-tap", count: 6 },
              { kind: "read-aloud", count: 6, from: "the eight tanween words" },
            ],
            "15 of 18",
          ),
          celebrate(U, "You found the hidden Noon!"),
        ],
      },
    ],
  }
}

export const UNIT_4 = build()
