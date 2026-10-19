import {
  celebrate,
  check,
  exercise,
  id,
  letterKey,
  letterName,
  readAloud,
  rule,
  shuffle,
  TATWEEL,
  type WordRow,
  words,
} from "../builders"
import { SPEAKERS } from "../letters"
import type { ShapesCard, Unit } from "../types"

const U = 3
const SHAPES = ["ب", "ن", "ي", "ج", "ك", "ل", "م", "ه", "ع", "ف"]

const FIRST_WORDS: WordRow[] = [
  ["كَتَبَ", "kataba", "He wrote. Three letters, three fathas."],
  ["جَعَلَ", "ja'ala", "He made."],
  ["خَلَقَ", "khalaqa", "He created. Two gold letters."],
  ["حَسَدَ", "Hasada", "Dal never holds the next hand, so the word ends after it."],
  ["ذَكَرَ", "dhakara", "Three letters that never join forward. Three gaps."],
  ["فَعَلَ", "fa'ala", "He did."],
  ["عَلِمَ", "'alima", "He knew. One kasra in the middle."],
  ["سَمِعَ", "sami'a", "He heard."],
  ["كَسَبَ", "kasaba", "He earned."],
  ["وَجَدَ", "wajada", "He found. Waw stands alone at the front."],
  ["وَهَبَ", "wahaba", "He gave. Ha in the middle looks like a knot."],
  ["بَخِلَ", "bakhila", "He was stingy."],
]

const HIDDEN: [string, string[]][] = [
  ["بلب", ["ب", "ل", "ب"]],
  ["نبت", ["ن", "ب", "ت"]],
  ["يجب", ["ي", "ج", "ب"]],
  ["تحت", ["ت", "ح", "ت"]],
  ["بهم", ["ب", "ه", "م"]],
  ["كتب", ["ك", "ت", "ب"]],
  ["بعد", ["ب", "ع", "د"]],
  ["قفل", ["ق", "ف", "ل"]],
  ["سمع", ["س", "م", "ع"]],
  ["فهم", ["ف", "ه", "م"]],
]

function shapesCard(ch: string): ShapesCard {
  const body =
    ch === "ه"
      ? "Ha changes the most. Alone it is a circle; at the start it is a loop with a tail; in the middle it looks like a knot; at the end it is a small curl."
      : ch === "ك"
        ? "Kaf alone has the mark inside. At the start and middle it becomes a diagonal stroke with a bar on top."
        : "Alone, at the start, in the middle, at the end. Find the dots: they stay the same."
  return {
    id: id(U, "shapes", letterKey(ch)),
    type: "shapes",
    arabic: ch,
    name: letterName(ch),
    forms: {
      isolated: ch,
      initial: ch + TATWEEL,
      medial: TATWEEL + ch + TATWEEL,
      final: TATWEEL + ch,
    },
    body,
  }
}

/** Split a vowelled word into letter+mark syllable tiles: كَتَبَ → [كَ, تَ, بَ]. */
export function syllableTiles(arabic: string): string[] {
  const tiles: string[] = []
  for (const c of arabic) {
    if (/[ً-ْٰ]/.test(c) && tiles.length) tiles[tiles.length - 1] += c
    else tiles.push(c)
  }
  return tiles
}

function build(): Unit {
  return {
    number: U,
    slug: "joining",
    title: "Letters hold hands",
    goal: "Recognise letters inside a word and blend short-vowel words.",
    why: "The printed Qaida drills 128 joined clusters with no vowels, which children cannot hear or say. Here joining is taught on ten shape-shifting letters and then used straight away on twelve real words.",
    steps: [
      {
        title: "What joining does",
        cards: [
          rule(
            U,
            "shapes",
            "Letters change shape when they hold hands",
            "When letters join into a word, most get shorter and lose their tail. A letter can look a little different at the start, in the middle and at the end. The dots never change, so count them first.",
            { example: `ب ب${TATWEEL} ${TATWEEL}ب${TATWEEL} ${TATWEEL}ب` },
          ),
          rule(
            U,
            "nonjoiners",
            "Six letters never hold the next hand",
            "ا د ذ ر ز و join to the letter before them but never to the one after. After one of these there is always a small gap inside the word.",
            { example: "ا د ذ ر ز و" },
          ),
          rule(
            U,
            "lamalif",
            "Lam and Alif are a pair",
            'Lam followed by Alif is written as one shape: لا. Read it "laa". You will see it everywhere.',
            { example: "لا" },
          ),
        ],
      },
      {
        title: "The shape-shifters",
        cards: [
          ...SHAPES.map(shapesCard),
          exercise(
            U,
            "which-letter-is-this",
            "which-letter-is-this",
            "This letter is in the middle of a word. Which letter is it?",
            shuffle(SHAPES, 3).map((ch, i) => ({
              arabic: TATWEEL + ch + TATWEEL,
              options: shuffle(
                [
                  ch,
                  ...shuffle(
                    SHAPES.filter((o) => o !== ch),
                    i,
                  ).slice(0, 3),
                ],
                i + 7,
              ),
              answer: ch,
            })),
          ),
          exercise(
            U,
            "which-letters-hide",
            "which-letters-hide",
            "Which letters are hiding in this word?",
            HIDDEN.map(([ar, parts], i) => {
              const extra = shuffle(
                SPEAKERS.filter((o) => !parts.includes(o)),
                i,
              ).slice(0, 2)
              return {
                arabic: ar,
                options: shuffle([...new Set([...parts, ...extra])], i + 2),
                answer: [...new Set(parts)],
              }
            }),
          ),
        ],
      },
      {
        title: "First real words",
        cards: [
          rule(
            U,
            "read-a-word",
            "How to read a word",
            "Start from the right. Say each letter with its mark. Then say them faster and faster until they become one word: ka… ta… ba… kataba.",
            {
              example: "كَتَبَ",
              teacher:
                "Let the child blend. Point to each letter and wait. Do not say the word for them until they have tried twice.",
            },
          ),
          ...words(U, FIRST_WORDS),
          exercise(
            U,
            "blend-it",
            "blend-it",
            "Tap the sounds in order, then say the word.",
            FIRST_WORDS.slice(0, 8).map(([ar, tr], i) => {
              const tiles = syllableTiles(ar)
              return { arabic: ar, translit: tr, tiles: shuffle(tiles, i), answer: tiles }
            }),
          ),
          readAloud(U, "read-aloud", "Read these words to your teacher.", FIRST_WORDS),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Can you read a word?",
            [
              { kind: "which-letter-is-this", count: 6, from: "middle and end forms" },
              { kind: "which-letters-hide", count: 4 },
              { kind: "read-aloud", count: 6, from: "the twelve first words, teacher marks each" },
            ],
            "13 of 16",
          ),
          celebrate(U, "You read your first words!"),
        ],
      },
    ],
  }
}

export const UNIT_3 = build()
