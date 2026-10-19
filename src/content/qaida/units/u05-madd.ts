import {
  celebrate,
  check,
  cons,
  DAMMA,
  drill,
  drillItem,
  exercise,
  FATHA,
  KASRA,
  letterKey,
  readAloud,
  rule,
  shuffle,
  syllable,
  type WordRow,
  words,
} from "../builders"
import { SPEAKERS } from "../letters"
import type { Unit } from "../types"

const U = 5

const MADD: WordRow[] = [
  ["قَالَ", "qaala", 'He said. Fatha then Alif: "aa".'],
  ["كَانَ", "kaana", "He was."],
  ["نُوْحٍ", "nooHin", 'Nuh. Damma then Waw: "oo".'],
  ["فِيْهِ", "feehi", 'In it. Kasra then Ya: "ee".'],
  ["مَالًا", "maalan", 'Wealth. A long "aa" and then tanween.'],
  ["نَارًا", "naaran", "Fire."],
  ["رَسُوْلٍ", "rasoolin", "Messenger."],
  ["كَبِيْرٌ", "kabeerun", "Big."],
]
const KHARI: WordRow[] = [
  ["عَلٰى", "'alaa", "On. The standing fatha is a small Alif."],
  ["ذٰلِكَ", "dhaalika", "That. Standing fatha on Dhal."],
  ["بِهٖ", "bihee", "With it. Standing kasra under Ha."],
  ["لَهٗ", "lahoo", "For him. Upside-down damma on Ha."],
]
const LEEN: WordRow[] = [
  ["خَوْفٍ", "khawfin", 'Fear. Fatha then Waw sakin: soft "aw".'],
  ["قَوْلٌ", "qawlun", "A saying."],
  ["كَيْفَ", "kayfa", 'How. Fatha then Ya sakin: soft "ay".'],
  ["لَيْسَ", "laysa", "Is not."],
]

const MADD_FORMS: [string, string][] = [
  [FATHA + "ا", "aa"],
  [DAMMA + "وْ", "oo"],
  [KASRA + "يْ", "ee"],
]

function build(): Unit {
  return {
    number: U,
    slug: "madd",
    title: "Stretch it",
    goal: "Hold madd for two counts, read standing marks as long, glide through leen.",
    why: "The printed Qaida separates madd, standing marks and leen into three lessons and 150 cells. They are one idea (short vs long vs soft), so they are one unit with sixteen words.",
    steps: [
      {
        title: "Teach: the three stretching letters",
        cards: [
          rule(
            U,
            "madd",
            "Three letters stretch the sound",
            'Alif after a fatha, Waw (with sukoon) after a damma, and Ya (with sukoon) after a kasra are madd letters. They make the sound long: "baa", "boo", "bee". Hold it for two counts, like saying it twice.',
            {
              example: "بَا بُوْ بِيْ",
              teacher:
                "Count on fingers: one, two. Short vowel is one, long is two. This becomes the base for four and six counts later.",
            },
          ),
          syllable(U, "ba.a", "بَ", "ba", "short", "ب", "syl/ba-a"),
          syllable(U, "ba.aa", "بَا", "baa", "long", "ب", "syl/ba-aa"),
          drill(
            U,
            "madd",
            "Every letter stretched three ways",
            SPEAKERS.filter((_, i) => i % 3 === 1).flatMap((ch) =>
              MADD_FORMS.map(([m, tr]) =>
                drillItem(ch, ch + m, cons(ch) + tr, `syl/${letterKey(ch)}-${tr}`),
              ),
            ),
            "A sample. Same rule for every letter.",
          ),
          exercise(
            U,
            "short-or-long",
            "short-or-long",
            "Listen. Short or long?",
            shuffle(SPEAKERS, 5)
              .slice(0, 10)
              .map((ch, i) => {
                const long = i % 2 === 1
                return {
                  audio: `syl/${letterKey(ch)}-${long ? "aa" : "a"}`,
                  options: [ch + FATHA, ch + FATHA + "ا"],
                  answer: long ? ch + FATHA + "ا" : ch + FATHA,
                }
              }),
          ),
          ...words(U, MADD),
          exercise(
            U,
            "find-it",
            "find-it",
            "Tap the stretched sound.",
            MADD.map(([ar, tr]) => ({ arabic: ar, translit: tr, answer: "the madd letter" })),
          ),
        ],
      },
      {
        title: "Teach: the small standing marks",
        cards: [
          rule(
            U,
            "khari",
            "Standing marks are long too",
            'Sometimes the long sound is written small: a standing fatha is a tiny Alif ("aa"), a standing kasra is a tiny Ya ("ee"), an upside-down damma is a tiny Waw ("oo"). Same sound, smaller writing.',
            { example: "بٰ بٖ بٗ" },
          ),
          ...words(U, KHARI),
          exercise(
            U,
            "same-sound",
            "same-sound",
            "These two are written differently. Do they sound the same? Tap yes or no.",
            (
              [
                ["بَا", "بٰ", "yes"],
                ["بِيْ", "بٖ", "yes"],
                ["بُوْ", "بٗ", "yes"],
                ["بَ", "بٰ", "no"],
                ["بِ", "بِيْ", "no"],
                ["بُ", "بٗ", "no"],
              ] as const
            ).map(([a, b, ans]) => ({ shown: [a, b], options: ["yes", "no"], answer: ans })),
          ),
        ],
      },
      {
        title: "Teach: the two soft letters",
        cards: [
          rule(
            U,
            "leen",
            "Two letters glide softly",
            'Waw sakin or Ya sakin after a fatha is a leen letter. Do not stretch it. Glide softly from one sound to the next: "baw", "bay".',
            { example: "بَوْ بَيْ" },
          ),
          ...words(U, LEEN),
          exercise(
            U,
            "madd-or-leen",
            "madd-or-leen",
            "Stretched (madd) or soft (leen)?",
            shuffle(SPEAKERS, 9)
              .slice(0, 8)
              .map((ch, i) => {
                const isMadd = i % 2 === 0
                return {
                  arabic: isMadd ? ch + DAMMA + "وْ" : ch + FATHA + "وْ",
                  options: ["madd", "leen"],
                  answer: isMadd ? "madd" : "leen",
                }
              }),
          ),
          readAloud(
            U,
            "read-aloud",
            "Read these to your teacher. Two counts for madd, soft for leen.",
            [...MADD, ...KHARI, ...LEEN],
          ),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Can you stretch and glide?",
            [
              { kind: "short-or-long", count: 6 },
              { kind: "madd-or-leen", count: 6 },
              { kind: "read-aloud", count: 8, from: "the sixteen words of this unit" },
            ],
            "16 of 20",
          ),
          celebrate(U, "Long and soft, done!"),
        ],
      },
    ],
  }
}

export const UNIT_5 = build()
