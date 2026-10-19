import {
  celebrate,
  check,
  exercise,
  FATHA,
  KASRA,
  letterKey,
  readAloud,
  rule,
  VOWEL_TR,
  word,
  type WordRow,
  words,
} from "../builders"
import type { Unit } from "../types"

const U = 8

const HEAVY_WORDS: WordRow[] = [
  ["خَلَقَ", "khalaqa", "Two gold letters, both heavy."],
  ["صِرَاطَ", "SiraaTa", "Path. From Al-Fatiha. Saad and Taa heavy."],
  ["ضَرَبَ", "Daraba", "He struck."],
  ["ظَلَمَ", "Zalama", "He wronged."],
  ["غَفَرَ", "ghafara", "He forgave."],
  ["قَدَرَ", "qadara", "He decreed."],
]

/** The note says which way the Ra goes; the exercise reads it. */
const RA: WordRow[] = [
  ["رَبِّ", "rabbi", "Fatha on Ra: thick."],
  ["رُسُلٌ", "rusulun", "Damma on Ra: thick."],
  ["رِزْقًا", "rizqan", "Kasra on Ra: thin."],
  ["اَلْفَجْرِ", "al-fajri", "Kasra on Ra: thin."],
  ["اَرْسَلَ", "arsala", "Ra sakin after fatha: thick."],
  ["فِرْعَوْنَ", "fir'awna", "Ra sakin after kasra: thin."],
]

/** [thin, thick] letter pairs for the ear, each with the mark they are heard on. */
const PAIRS: [string, string, string][] = [
  ["ت", "ط", FATHA],
  ["س", "ص", FATHA],
  ["د", "ض", FATHA],
  ["ذ", "ظ", FATHA],
  ["ك", "ق", FATHA],
  ["ح", "خ", FATHA],
  ["ع", "غ", FATHA],
  ["س", "ص", KASRA],
]

function build(): Unit {
  return {
    number: U,
    slug: "thick-thin",
    title: "Thick and thin",
    goal: "Say heavy letters heavy, and get Ra and the Lam of Allah right.",
    why: "The printed Qaida never teaches pronunciation as a lesson, only as footnotes. Children outside the Arab world need it taught on purpose, before the reading rules.",
    steps: [
      {
        title: "Teach",
        cards: [
          rule(
            U,
            "heavy",
            "Seven thick letters, said with a full mouth",
            "You have met them all: خ ص ض ط ظ غ ق. Lift the back of your tongue and fill your mouth with the sound. Every other letter stays thin and light. Thin next to thick is what makes Arabic sound like Arabic.",
            { example: "خ ص ض ط ظ غ ق" },
          ),
          ...words(U, HEAVY_WORDS),
          exercise(
            U,
            "thick-or-thin",
            "thick-or-thin",
            "Thick or thin? Listen and tap.",
            PAIRS.map(([thin, thick, mark], i) => {
              const pick = i % 2 ? thick : thin
              return {
                audio: `syl/${letterKey(pick)}-${VOWEL_TR[mark]}`,
                options: [thin + mark, thick + mark],
                answer: pick + mark,
              }
            }),
          ),
          rule(
            U,
            "ra",
            "Ra changes sides",
            "Ra is the one letter that is sometimes thick and sometimes thin. Fatha or damma on Ra: thick. Kasra on Ra: thin. Ra with sukoon copies the letter before it.",
            { example: "رَ رُ ← thick · رِ ← thin" },
          ),
          ...words(U, RA),
          exercise(
            U,
            "ra-thick-or-thin",
            "ra-thick-or-thin",
            "Is this Ra thick or thin?",
            RA.map(([ar, tr, note]) => ({
              arabic: ar,
              translit: tr,
              options: ["thick", "thin"],
              answer: note!.includes("thin") ? "thin" : "thick",
            })),
          ),
          rule(
            U,
            "lam-allah",
            "The Lam of Allah",
            "In the word Allah, the Lam is thick when the letter before it has fatha or damma (قَالَ اللّٰهُ), and thin when the letter before has kasra (بِسْمِ اللّٰهِ).",
            { example: "بِسْمِ اللّٰهِ · قَالَ اللّٰهُ" },
          ),
          word(U, "بِسْمِ اللّٰهِ", "bismillaahi", "Kasra before Allah: thin Lam."),
          word(U, "قَالَ اللّٰهُ", "qaalallaahu", "Fatha before Allah: thick Lam."),
          word(U, "رَسُوْلُ اللّٰهِ", "rasoolullaahi", "Damma before Allah: thick Lam."),
          readAloud(
            U,
            "read-aloud",
            "Read these to your teacher. Thick and thin in the right places.",
            [...HEAVY_WORDS, ...RA],
          ),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Thick where it should be thick?",
            [
              { kind: "thick-or-thin", count: 6 },
              { kind: "ra-thick-or-thin", count: 4 },
              { kind: "read-aloud", count: 8 },
            ],
            "14 of 18",
          ),
          celebrate(U, "You sound like a reader now!"),
        ],
      },
    ],
  }
}

export const UNIT_8 = build()
