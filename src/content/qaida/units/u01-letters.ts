import {
  celebrate,
  check,
  exercise,
  id,
  letterKey,
  letterName,
  marksOf,
  rule,
  shuffle,
} from "../builders"
import { LETTER_BY_CHAR, LETTERS } from "../letters"
import type { Card, FamilyCard, LetterCard, Step, Unit } from "../types"

const U = 1

interface Family {
  slug: string
  title: string
  members: string[]
  share: string
}

/** Letters taught together because they share a body. Order is the teaching order. */
export const FAMILIES: Family[] = [
  {
    slug: "boat",
    title: "The boat family",
    members: ["ب", "ت", "ث", "ن", "ي"],
    share:
      "All five sit in the same little boat. Only the dots are different: one below, two above, three above, one above, two below.",
  },
  {
    slug: "hook",
    title: "The hook family",
    members: ["ج", "ح", "خ"],
    share: "One hook shape. Dot inside, no dot, dot on top.",
  },
  {
    slug: "tall",
    title: "The tall family",
    members: ["ا", "ل", "ك"],
    share:
      "Three tall letters. Alif is a plain stick. Lam bends into a bowl. Kaf has a little mark inside.",
  },
  {
    slug: "short",
    title: "The short family",
    members: ["د", "ذ", "ر", "ز"],
    share: "Two elbows and two dips. These four never hold the next letter's hand.",
  },
  {
    slug: "teeth",
    title: "The teeth and loop family",
    members: ["س", "ش", "ص", "ض"],
    share:
      "Seen and Sheen have three teeth. Saad and Daad have a loop instead. Dots on top tell the pairs apart.",
  },
  {
    slug: "loopstick",
    title: "The loop-and-stick and open-mouth family",
    members: ["ط", "ظ", "ع", "غ"],
    share:
      "Taa and Zaa are a loop with a stick. Ayn and Ghayn look like an open mouth. One dot on top makes the second of each pair.",
  },
  {
    slug: "smallloop",
    title: "The small loop family",
    members: ["ف", "ق", "م"],
    share:
      "Fa has one dot, Qaf has two and a deeper tail, Meem has no dot and a tail that drops straight down.",
  },
  {
    slug: "round",
    title: "The round and tail family",
    members: ["ه", "و", "ء"],
    share:
      "Ha is a little circle. Waw is a head with a dipping tail. Hamza is a tiny hook that usually sits on another letter.",
  },
]

export function letterCard(unit: number, ch: string): LetterCard {
  const l = LETTER_BY_CHAR[ch]
  return {
    id: id(unit, "letter", l.key),
    type: "letter",
    arabic: ch,
    letter: l.key,
    name: l.name,
    nameAr: l.nameAr,
    translit: l.tr,
    sound: l.sound,
    tip: l.tip,
    connects: l.connects,
    ...marksOf(ch),
    audio: `letters/${l.key}`,
  }
}

function familyStep(f: Family, index: number, seen: string[]): Step {
  const cards: Card[] = []
  const family: FamilyCard = {
    id: id(U, "family", f.slug),
    type: "family",
    title: f.title,
    arabic: f.members.join(" "),
    members: f.members,
    body: f.share,
  }
  cards.push(family)
  for (const ch of f.members) cards.push(letterCard(U, ch))

  cards.push(
    exercise(
      U,
      `spot.${f.slug}`,
      "spot-the-letter",
      "Count the dots. Tap the letter I name.",
      f.members.map((ch) => ({ options: f.members, answer: ch, ask: `Tap ${letterName(ch)}` })),
    ),
  )
  if (f.members.length > 2) {
    cards.push(
      exercise(
        U,
        `odd.${f.slug}`,
        "odd-one-out",
        "Three are the same letter. One is different. Tap the different one.",
        f.members.map((ch, i) => {
          const other = f.members[(i + 1) % f.members.length]
          return { options: shuffle([ch, ch, ch, other], index * 10 + i), answer: other }
        }),
      ),
    )
  }
  cards.push(
    exercise(
      U,
      `listen.${f.slug}`,
      "listen-and-tap",
      "Listen to the name. Tap the letter.",
      f.members.map((ch, i) => {
        const old = shuffle(
          seen.filter((o) => !f.members.includes(o)),
          index + i,
        ).slice(0, 1)
        const pool = shuffle([...f.members, ...old], i + 3)
        const options = pool.includes(ch)
          ? pool.slice(0, 4).includes(ch)
            ? pool.slice(0, 4)
            : [ch, ...pool.filter((o) => o !== ch).slice(0, 3)]
          : [ch, ...pool.slice(0, 3)]
        return { audio: `letters/${letterKey(ch)}`, options, answer: ch }
      }),
    ),
  )
  // Two review rounds: after the first four families and after all eight.
  if (index === 3 || index === 7) {
    cards.push(
      exercise(
        U,
        `speed.${f.slug}`,
        "speed-round",
        "Fast! Name each letter as it appears. Three seconds each.",
        shuffle(seen, index)
          .slice(0, 12)
          .map((ch) => ({
            arabic: ch,
            answer: letterName(ch),
            audio: `letters/${letterKey(ch)}`,
          })),
        { seconds: 3 },
      ),
    )
  }
  return { title: f.title, cards }
}

function build(): Unit {
  const steps: Step[] = []
  steps.push({
    title: "How this unit works",
    cards: [
      rule(
        U,
        "families",
        "Letters come in families",
        "Many Arabic letters share one body. What makes them different is the dots: how many, and whether they sit above or below. So we learn letters family by family, and we always count the dots first.",
        { example: "ب ت ث ن ي" },
      ),
      rule(
        U,
        "heavy",
        "Seven letters are thick",
        "Seven letters are said with a full, heavy mouth: خ ص ض ط ظ غ ق. They are coloured gold everywhere in this course. All other letters are light and thin.",
        {
          example: "خ ص ض ط ظ غ ق",
          teacher:
            "Chant them as one line: khaa, Saad, Daad, Taa, Zaa, ghayn, qaaf. Children remember the tune before the rule.",
        },
      ),
    ],
  })

  const seen: string[] = []
  FAMILIES.forEach((f, i) => {
    steps.push(familyStep(f, i, seen))
    seen.push(...f.members)
  })

  steps.push({
    title: "Two special shapes",
    cards: [
      {
        ...letterCard(U, "ى"),
        tip: 'Only at the end of a word. Looks like Ya with no dots and is read "aa". You will meet it in عَلٰى and مُوْسٰى.',
      },
      rule(
        U,
        "ta-marbuta",
        "The round Ta",
        'A Ha with two dots on top is a round Ta: ة. It only comes at the end of a word. Read it "t" when you keep going, "h" when you stop.',
        { example: "ة" },
      ),
    ],
  })

  steps.push({
    title: "Unit check",
    cards: [
      check(
        U,
        "Can you name every letter?",
        [
          { kind: "listen-and-tap", count: 10, from: "all letters, 4 options each" },
          { kind: "spot-the-letter", count: 6, from: "look-alike families only" },
          { kind: "say-it", count: 10, from: "random letters, teacher marks each" },
        ],
        "22 of 26",
      ),
      celebrate(U, "You know all the letters!"),
    ],
  })

  return {
    number: U,
    slug: "letters",
    title: "Meet the letters",
    goal: `Recognise and name all ${LETTERS.length - 1} letters by their shape and dots.`,
    why: "Taught by family, not alphabet order, so the child sees from day one that dots decide the letter. No vowels yet, no joining yet.",
    steps,
  }
}

export const UNIT_1 = build()
