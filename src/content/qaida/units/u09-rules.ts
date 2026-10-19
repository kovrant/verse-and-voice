import { celebrate, check, exercise, readAloud, rule, type WordRow, words } from "../builders"
import type { Step, Unit } from "../types"

const U = 9

interface ReaderRule {
  slug: string
  title: string
  body: string
  cue: string
  examples: WordRow[]
}

const RULES: ReaderRule[] = [
  {
    slug: "izhar",
    title: "Clear Noon",
    body: "If Noon sakin or tanween is followed by a throat letter (ء ه ع ح غ خ), read the Noon clearly, no hum.",
    cue: "The Noon has a visible sukoon.",
    examples: [
      ["مِنْ هَادٍ", "min haadin"],
      ["اَنْعَمْتَ", "an'amta", "From Al-Fatiha."],
    ],
  },
  {
    slug: "idgham",
    title: "Melting Noon",
    body: "If Noon sakin or tanween is followed by ي ر م ل و ن, the Noon melts into that letter, which is read doubled. With ي م و ن you hum too; with ل ر you do not.",
    cue: "No sukoon on the Noon, and a shaddah on the next letter.",
    examples: [
      ["مِنْ رَّبِّكَ", "mir-rabbika", "No hum."],
      ["مَنْ يَّعْمَلْ", "may-ya'mal", "Hum."],
    ],
  },
  {
    slug: "iqlab",
    title: "Noon turns into Meem",
    body: "If Noon sakin or tanween is followed by Ba, read it as a humming Meem.",
    cue: "A tiny Meem is printed above the Noon.",
    examples: [
      ["مِنْۢ بَعْدِ", "mim-ba'di"],
      ["سَمِيْعٌۢ بَصِيْرٌ", "samee'um-baSeerun"],
    ],
  },
  {
    slug: "ikhfa",
    title: "Hidden Noon",
    body: "Before the other fifteen letters, hide the Noon: the tongue does not touch, and you hum for two counts.",
    cue: "No sukoon on the Noon, no shaddah on the next letter.",
    examples: [
      ["اَنْتَ", "anta"],
      ["مِنْ شَرِّ", "min sharri", "From An-Nas."],
    ],
  },
  {
    slug: "meem-sakin",
    title: "Meem sakin before Ba",
    body: "Meem sakin followed by Ba is read with a hum, lips lightly closed. Before any other letter, Meem sakin is read clear.",
    cue: "Meem with sukoon, then Ba.",
    examples: [
      ["تَرْمِيْهِمْ بِحِجَارَةٍ", "tarmeehim-biHijaaratin"],
      ["لَكُمْ دِيْنُكُمْ", "lakum deenukum", "Clear Meem."],
    ],
  },
  {
    slug: "madd-lengths",
    title: "How long is long?",
    body: "Normal madd is two counts. If a hamza comes right after the madd in the same word, four counts. If a shaddah or sukoon comes after it, six counts. The wavy madd sign in the text is your cue to go longer.",
    cue: "The ~ sign above the madd letter.",
    examples: [
      ["مَآءٍ", "maa'in", "Four counts."],
      ["وَلَا الضَّآلِّيْنَ", "wa laD-Daaalleena", "Six counts. The last word of Al-Fatiha."],
    ],
  },
  {
    slug: "waqf",
    title: "Stopping",
    body: 'When you stop on a word, read its last letter with sukoon. Tanween fatha becomes a long "aa". Round Ta becomes "h". The small letters above the text are stop signs: ۝ end of ayah, م must stop, ط better to stop, ج your choice, لا do not stop here.',
    cue: "A stop sign, or the end of the ayah.",
    examples: [
      ["اَحَدٌ ← اَحَدْ", "aHadun → aHad"],
      ["عَلِيْمًا ← عَلِيْمَا", "'aleeman → 'aleemaa"],
    ],
  },
]

const RULE_TITLES = RULES.filter((r) => r.slug !== "waqf").map((r) => r.title)

const DETECTIVE: [string, string][] = [
  ["مِنْ رَّبِّكَ", "Melting Noon"],
  ["اَنْتَ", "Hidden Noon"],
  ["مِنْۢ بَعْدِ", "Noon turns into Meem"],
  ["اَنْعَمْتَ", "Clear Noon"],
  ["مَنْ يَّعْمَلْ", "Melting Noon"],
  ["مِنْ شَرِّ", "Hidden Noon"],
  ["سَمِيْعٌۢ بَصِيْرٌ", "Noon turns into Meem"],
  ["مِنْ هَادٍ", "Clear Noon"],
  ["تَرْمِيْهِمْ بِحِجَارَةٍ", "Meem sakin before Ba"],
  ["وَلَا الضَّآلِّيْنَ", "How long is long?"],
]

function build(): Unit {
  const steps: Step[] = RULES.map((r) => ({
    title: r.title,
    cards: [rule(U, r.slug, r.title, r.body, { cue: r.cue }), ...words(U, r.examples)],
  }))
  steps.push({
    title: "Try",
    cards: [
      exercise(
        U,
        "rule-detective",
        "rule-detective",
        "Which rule is hiding in this word?",
        DETECTIVE.map(([ar, ans]) => ({ arabic: ar, options: RULE_TITLES, answer: ans })),
      ),
      exercise(
        U,
        "count-it",
        "count-it",
        "How many counts for this madd? Tap 2, 4 or 6.",
        (
          [
            ["قَالَ", "2"],
            ["مَآءٍ", "4"],
            ["الضَّآلِّيْنَ", "6"],
            ["جَآءَ", "4"],
            ["نُوْحٍ", "2"],
            ["الصَّآخَّةُ", "6"],
          ] as const
        ).map(([ar, ans]) => ({ arabic: ar, options: ["2", "4", "6"], answer: ans })),
      ),
      exercise(
        U,
        "stop-here",
        "stop-here",
        "Read this word and stop on it. How does it end?",
        (
          [
            ["اَحَدٌ", "aHad"],
            ["عَلِيْمًا", "'aleemaa"],
            ["جَنَّةٍ", "jannah"],
            ["اَلْعٰلَمِيْنَ", "al-'aalameen"],
          ] as const
        ).map(([ar, ans]) => ({ arabic: ar, answer: ans })),
      ),
      readAloud(
        U,
        "read-aloud",
        "Read every example in this unit to your teacher, with its rule.",
        RULES.flatMap((r) => r.examples),
      ),
    ],
  })
  steps.push({
    title: "Unit check",
    cards: [
      check(
        U,
        "Do you know the reader's rules?",
        [
          { kind: "rule-detective", count: 8 },
          { kind: "count-it", count: 4 },
          { kind: "read-aloud", count: 8, from: "the examples, teacher listens for the rule" },
        ],
        "16 of 20",
      ),
      celebrate(U, "Every rule, in your hands!"),
    ],
  })
  return {
    number: U,
    slug: "rules",
    title: "The reader's rules",
    goal: "Apply the noon sakin and tanween rules, meem sakin, madd lengths and stopping.",
    why: "Each rule gets one card, two example words and a visible cue in the text. The detective exercise is where it sticks: the child learns to see the rule before reading it.",
    steps,
  }
}

export const UNIT_9 = build()
