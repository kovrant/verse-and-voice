import {
  celebrate,
  check,
  cons,
  drill,
  drillItem,
  exercise,
  FATHA,
  letterKey,
  readAloud,
  rule,
  SHADDA,
  shuffle,
  syllable,
  type WordRow,
  words,
} from "../builders"
import { SPEAKERS } from "../letters"
import type { Unit } from "../types"

const U = 7
const single = (ch: string) => "اَ" + ch + FATHA
const doubled = (ch: string) => "اَ" + ch + SHADDA + FATHA

const WORDS: WordRow[] = [
  ["اِنَّ", "inna", "Indeed. Noon doubled, so you hum."],
  ["ثُمَّ", "thumma", "Then. Meem doubled, so you hum."],
  ["رَبِّ", "rabbi", "My Lord. From Al-Fatiha."],
  ["جَنَّةٍ", "jannatin", "A garden."],
  ["ذَرَّةٍ", "dharratin", "An atom."],
  ["قُوَّةٍ", "quwwatin", "Strength."],
  ["اِيَّاكَ", "iyyaaka", "You alone. From Al-Fatiha."],
  ["لِلّٰهِ", "lillaahi", "For Allah. Lam doubled, then a standing fatha."],
  ["مُدَّتْ", "muddat", "Was spread. Shaddah and then a sukoon."],
  ["تَبَّتْ", "tabbat", "Perished. Surah Al-Masad begins with it."],
]

const HUM_WORDS = [
  "اِنَّ",
  "ثُمَّ",
  "رَبِّ",
  "جَنَّةٍ",
  "ذَرَّةٍ",
  "قُوَّةٍ",
  "اَمَّا",
  "عَمَّ",
  "حَقٌّ",
  "كُلٌّ",
]

function build(): Unit {
  return {
    number: U,
    slug: "shaddah",
    title: "Double it",
    goal: "Press a doubled letter and hum on doubled Noon and Meem.",
    why: "Shaddah, shaddah-with-sukoon and shaddah-with-shaddah are one skill (press, then continue), so they are one unit. Three of the ten words are from Al-Fatiha.",
    steps: [
      {
        title: "Teach",
        cards: [
          rule(
            U,
            "shaddah",
            "Shaddah doubles the letter",
            'A small "w" on a letter is shaddah. Read the letter twice: first closed, joined to the letter before, then with its own vowel. اَبَّ is "ab-ba". Press the letter firmly.',
            {
              example: "اَبَّ اِبِّ اُبُّ",
              teacher:
                'Tashdeed in the Qaida. Ask: "How many times?" twice. "How?" firmly. The child should feel the press on the tongue or lips.',
            },
          ),
          syllable(U, "aba", "اَبَ", "aba", "single", "ب", "syl/aba"),
          syllable(U, "abba", "اَبَّ", "ab-ba", "doubled", "ب", "syl/abba"),
          drill(
            U,
            "shaddah",
            "Every letter doubled after fatha",
            SPEAKERS.map((ch) =>
              drillItem(
                ch,
                doubled(ch),
                `a${cons(ch)}-${cons(ch)}a`,
                `syl/a${letterKey(ch)}${letterKey(ch)}a`,
              ),
            ),
            "Rose letters hum. See the next card.",
          ),
          rule(
            U,
            "ghunna",
            "Doubled Noon and Meem hum",
            "Whenever Noon or Meem has a shaddah, hum through your nose for two counts. اِنَّ and ثُمَّ both hum. This hum is called ghunna, and it is marked rose in this course.",
            { example: "اِنَّ ثُمَّ" },
          ),
        ],
      },
      {
        title: "Try",
        cards: [
          exercise(
            U,
            "single-or-double",
            "single-or-double",
            "Single or doubled? Listen and tap.",
            shuffle(SPEAKERS, 7)
              .slice(0, 10)
              .map((ch, i) => {
                const dbl = i % 2 === 0
                const k = letterKey(ch)
                return {
                  audio: `syl/a${k}${dbl ? k : ""}a`,
                  options: [single(ch), doubled(ch)],
                  answer: dbl ? doubled(ch) : single(ch),
                }
              }),
          ),
          exercise(
            U,
            "hum-or-not",
            "hum-or-not",
            "Does this one hum?",
            shuffle(HUM_WORDS, 2).map((ar) => ({
              arabic: ar,
              options: ["hum", "no hum"],
              answer: /[نم]ّ/.test(ar) ? "hum" : "no hum",
            })),
          ),
          ...words(U, WORDS),
          exercise(
            U,
            "find-it",
            "find-it",
            "Tap the doubled letter.",
            WORDS.map(([ar, tr]) => ({
              arabic: ar,
              translit: tr,
              answer: "the letter with shaddah",
            })),
          ),
          readAloud(
            U,
            "read-aloud",
            "Read these to your teacher. Press the doubled letter, hum on Noon and Meem.",
            WORDS,
          ),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Can you double and hum?",
            [
              { kind: "single-or-double", count: 6 },
              { kind: "hum-or-not", count: 6 },
              { kind: "read-aloud", count: 8, from: "the ten shaddah words" },
            ],
            "16 of 20",
          ),
          celebrate(U, "Strong and clear!"),
        ],
      },
    ],
  }
}

export const UNIT_7 = build()
