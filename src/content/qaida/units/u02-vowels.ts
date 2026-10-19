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
  rule,
  shuffle,
  VOWEL_TR,
  vowelSyllable,
} from "../builders"
import { SPEAKERS } from "../letters"
import type { Step, Unit } from "../types"

const U = 2
const MODEL = ["ب", "ت", "ن", "م"]
const MARKS = [FATHA, KASRA, DAMMA]
const MARK_NAMES = ["fatha", "kasra", "damma"]

function vowelStep(
  mark: string,
  name: string,
  alsoCalled: string,
  sound: string,
  where: string,
  hint: string,
): Step {
  const Name = name[0].toUpperCase() + name.slice(1)
  const cards = [
    rule(
      U,
      name,
      `${Name} says "${sound}"`,
      `${where} It gives the letter the sound "${sound}". Say the letter and the mark together, short and quick, as one sound: ${MODEL.slice(
        0,
        3,
      )
        .map((ch) => cons(ch) + VOWEL_TR[mark])
        .join(", ")}.`,
      {
        example: MODEL.slice(0, 3)
          .map((ch) => ch + mark)
          .join(" "),
        teacher: `${alsoCalled}. Keep it short. Stretching the vowel here is the most common habit to catch early.`,
      },
    ),
    ...MODEL.map((ch) => vowelSyllable(U, ch, mark, name)),
    drill(
      U,
      name,
      `Every letter with ${name}`,
      SPEAKERS.map((ch) =>
        drillItem(
          ch,
          ch + mark,
          cons(ch) + VOWEL_TR[mark],
          `syl/${letterKey(ch)}-${VOWEL_TR[mark]}`,
        ),
      ),
      hint,
    ),
    exercise(
      U,
      `listen.${name}`,
      "listen-and-tap",
      "Listen. Tap the sound you heard.",
      shuffle(SPEAKERS, mark.charCodeAt(0))
        .slice(0, 8)
        .map((ch, i) => {
          const others = shuffle(
            SPEAKERS.filter((o) => o !== ch),
            i,
          ).slice(0, 2)
          return {
            audio: `syl/${letterKey(ch)}-${VOWEL_TR[mark]}`,
            options: shuffle([ch, ...others], i + 5).map((o) => o + mark),
            answer: ch + mark,
          }
        }),
    ),
  ]
  return { title: Name, cards }
}

function build(): Unit {
  const steps: Step[] = [
    {
      title: "Reading the English under the Arabic",
      cards: [
        rule(
          U,
          "legend",
          "The small English letters",
          'Under each Arabic card there is an English hint for the sound. Capital S, D, T, Z are the heavy letters ص ض ط ظ. "kh", "gh" and "q" are heavy too. "H" is ح, "th" is ث, "dh" is ذ. A doubled letter is pressed twice. "aa", "ee", "oo" are long sounds. An apostrophe is a hamza or an ayn.',
          {
            teacher:
              "The hint is a crutch. Hide it (teacher control) as soon as the child reads the Arabic without it.",
          },
        ),
      ],
    },
    vowelStep(
      FATHA,
      "fatha",
      "In Pakistan and India this is called zabar",
      "a",
      "Fatha is a small line on top of the letter.",
      "Point and say. Thin letters light, gold letters heavy.",
    ),
    vowelStep(
      KASRA,
      "kasra",
      "Also called zer",
      "i",
      "Kasra is a small line under the letter.",
      'Kasra pulls the sound forward in the mouth, like "sit".',
    ),
    vowelStep(
      DAMMA,
      "damma",
      "Also called pesh",
      "u",
      "Damma is a small loop on top of the letter.",
      "Lips round for every damma, even on a thin letter.",
    ),
    {
      title: "Mix them up",
      cards: [
        rule(
          U,
          "hamza-alif",
          "Alif with a mark is Hamza",
          'When Alif has a fatha, kasra or damma, it is really a Hamza: اَ اِ اُ are "a", "i", "u", from the throat. A plain Alif with no mark has no sound of its own.',
          { example: "اَ اِ اُ" },
        ),
        exercise(
          U,
          "which-mark",
          "which-mark",
          "Which mark is on the letter? Tap fatha, kasra or damma.",
          shuffle(SPEAKERS, 21)
            .slice(0, 10)
            .map((ch, i) => ({
              arabic: ch + MARKS[i % 3],
              options: MARK_NAMES,
              answer: MARK_NAMES[i % 3],
            })),
        ),
        exercise(
          U,
          "same-or-different",
          "same-or-different",
          "Listen to two sounds. Same or different?",
          shuffle(SPEAKERS, 33)
            .slice(0, 8)
            .map((ch, i) => {
              const same = i % 2 === 0
              const m1 = MARKS[i % 3]
              const m2 = same ? m1 : MARKS[(i + 1) % 3]
              return {
                audio: [
                  `syl/${letterKey(ch)}-${VOWEL_TR[m1]}`,
                  `syl/${letterKey(ch)}-${VOWEL_TR[m2]}`,
                ],
                shown: [ch + m1, ch + m2],
                options: ["same", "different"],
                answer: same ? "same" : "different",
              }
            }),
        ),
        exercise(
          U,
          "build-the-sound",
          "build-the-sound",
          "Hear the sound. Tap the letter, then tap the mark.",
          shuffle(SPEAKERS, 44)
            .slice(0, 8)
            .map((ch, i) => {
              const m = (i + 2) % 3
              return {
                audio: `syl/${letterKey(ch)}-${VOWEL_TR[MARKS[m]]}`,
                letters: shuffle(
                  [
                    ch,
                    ...shuffle(
                      SPEAKERS.filter((o) => o !== ch),
                      i,
                    ).slice(0, 2),
                  ],
                  i,
                ),
                marks: MARK_NAMES,
                answer: [ch, MARK_NAMES[m]],
              }
            }),
        ),
        exercise(
          U,
          "speed-round",
          "speed-round",
          "Fast! Read each sound as it appears.",
          shuffle(SPEAKERS, 55)
            .slice(0, 12)
            .map((ch, i) => ({
              arabic: ch + MARKS[i % 3],
              answer: cons(ch) + VOWEL_TR[MARKS[i % 3]],
            })),
          { seconds: 3 },
        ),
      ],
    },
    {
      title: "Unit check",
      cards: [
        check(
          U,
          "Can every letter speak?",
          [
            { kind: "listen-and-tap", count: 8, from: "any letter, any of the three marks" },
            { kind: "which-mark", count: 6 },
            { kind: "say-it", count: 10, from: "random letter + mark, teacher marks each" },
          ],
          "20 of 24",
        ),
        celebrate(U, "The letters can talk!"),
      ],
    },
  ]
  return {
    number: U,
    slug: "vowels",
    title: "Letters speak",
    goal: "Read any single letter with fatha, kasra or damma, short and crisp.",
    why: `Vowels come before joining. A child who can make ${SPEAKERS.length * 3} sounds from letters they already know gets a quick win, and joining in the next unit produces real words immediately.`,
    steps,
  }
}

export const UNIT_2 = build()
