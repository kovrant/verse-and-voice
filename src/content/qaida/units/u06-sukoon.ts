import {
  celebrate,
  check,
  cons,
  drill,
  drillItem,
  exercise,
  letterKey,
  readAloud,
  rule,
  shuffle,
  SUKOON,
  syllable,
  type WordRow,
  words,
} from "../builders"
import { QALQALA, SPEAKERS } from "../letters"
import type { Unit } from "../types"

const U = 6
const closed = (ch: string) => "اَ" + ch + SUKOON

const WORDS: WordRow[] = [
  ["اَنْتَ", "anta", 'You. Noon with sukoon joins onto the "a".'],
  ["كُنْتُ", "kuntu", "I was."],
  ["بَعْدَ", "ba'da", "After."],
  ["عَبْدًا", "'abdan", "A servant. Ba has sukoon, so it bounces."],
  ["يَخْرُجُ", "yakhruju", "He goes out. Gold Kha with sukoon."],
  ["نَعْبُدُ", "na'budu", "We worship. From Al-Fatiha."],
  ["اَلْحَمْدُ", "al-Hamdu", "All praise. From Al-Fatiha."],
  ["يَعْمَلُوْنَ", "ya'maloona", "They do. Sukoon, then a madd."],
  ["مِسْكٌ", "miskun", "Musk."],
  ["اِقْرَأْ", "iqra'", "Read! Qaf bounces, and the hamza at the end stops."],
]

/** Pairs whose sukoon sounds children mix up. */
const CLOSE_PAIRS: [string, string][] = [
  ["ت", "ط"],
  ["ث", "س"],
  ["س", "ص"],
  ["ذ", "ز"],
  ["ز", "ظ"],
  ["ك", "ق"],
  ["ح", "ه"],
  ["ع", "ء"],
]

function build(): Unit {
  return {
    number: U,
    slug: "sukoon",
    title: "Stop and join",
    goal: "Close a syllable with sukoon and bounce the five qalqala letters.",
    why: "Ten words instead of 150, two of them from Al-Fatiha so the child starts recognising the surah before Unit 10.",
    steps: [
      {
        title: "Teach",
        cards: [
          rule(
            U,
            "sukoon",
            "Sukoon means no vowel",
            'A small circle on a letter is sukoon. The letter has no vowel of its own, so it joins onto the letter before it: اَبْ is "ab". Say both letters as one piece.',
            {
              example: "اَبْ اِبْ اُبْ",
              teacher:
                'Called jazm in the Qaida. Ask: "What is the circle?" sukoon. "How do we read a letter with sukoon?" joined to the one before. The pairs ت/ط, ث/س/ص, ذ/ز/ظ, ك/ق are where sukoon sounds get mixed; drill them on the listen exercise.',
            },
          ),
          syllable(U, "ba.a", "بَ", "ba", "open", "ب", "syl/ba-a"),
          syllable(U, "ab", "اَبْ", "ab", "closed", "ب", "syl/ab"),
          drill(
            U,
            "sukoon",
            "Every letter closed after fatha",
            SPEAKERS.map((ch) =>
              drillItem(ch, closed(ch), "a" + cons(ch), `syl/a${letterKey(ch)}`),
            ),
            "Blue letters bounce. See the next card.",
          ),
          rule(
            U,
            "qalqala",
            "Five letters bounce",
            'When ق ط ب ج د have a sukoon, the sound bounces a little, like a tiny echo: "ab-b", "aq-q". These are the qalqala letters. They are marked blue in this course.',
            {
              example: "ق ط ب ج د",
              teacher: 'The chant is "qutub jad". Five letters, one bounce.',
            },
          ),
        ],
      },
      {
        title: "Try",
        cards: [
          exercise(
            U,
            "bounce-or-not",
            "bounce-or-not",
            "Does this letter bounce?",
            shuffle(SPEAKERS, 6)
              .slice(0, 10)
              .map((ch) => ({
                arabic: closed(ch),
                options: ["bounce", "no bounce"],
                answer: QALQALA.includes(ch) ? "bounce" : "no bounce",
              })),
          ),
          exercise(
            U,
            "listen",
            "listen-and-tap",
            "Listen carefully. These pairs sound close.",
            CLOSE_PAIRS.map(([a, b], i) => {
              const pick = i % 2 ? b : a
              return {
                audio: `syl/a${letterKey(pick)}`,
                options: [closed(a), closed(b)],
                answer: closed(pick),
              }
            }),
          ),
          ...words(U, WORDS),
          exercise(
            U,
            "find-it",
            "find-it",
            "Tap the letter with sukoon.",
            WORDS.slice(0, 8).map(([ar, tr]) => ({
              arabic: ar,
              translit: tr,
              answer: "the letter with the circle",
            })),
          ),
          readAloud(
            U,
            "read-aloud",
            "Read these to your teacher. Join the closed letter, bounce the blue ones.",
            WORDS,
          ),
        ],
      },
      {
        title: "Unit check",
        cards: [
          check(
            U,
            "Can you stop and join?",
            [
              { kind: "listen-and-tap", count: 6, from: "the close pairs" },
              { kind: "bounce-or-not", count: 6 },
              { kind: "read-aloud", count: 8, from: "the ten sukoon words" },
            ],
            "16 of 20",
          ),
          celebrate(U, "You can stop and join!"),
        ],
      },
    ],
  }
}

export const UNIT_6 = build()
