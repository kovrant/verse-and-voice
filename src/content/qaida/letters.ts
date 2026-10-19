/** The 29 letters plus the dotless final Ya, as the printed Qaida lists them (page 2). */
export interface Letter {
  ch: string
  /** Stable key used in ids and audio paths. */
  key: string
  name: string
  nameAr: string
  /** Kid transliteration of the bare consonant. Alif is "a" (it carries the vowel). */
  tr: string
  /** False for the six letters that never join to the letter after them. */
  connects: boolean
  /** Look-alike family (same body, different dots). */
  family: FamilyKey
  sound: string
  tip: string
  heavy?: boolean
  qalqala?: boolean
  ghunna?: boolean
}

export type FamilyKey =
  | "alif"
  | "boat"
  | "hook"
  | "dal"
  | "ra"
  | "seen"
  | "sad"
  | "ta"
  | "ayn"
  | "fa"
  | "kaf"
  | "lam"
  | "meem"
  | "waw"
  | "ha"
  | "hamza"

export const LETTERS: Letter[] = [
  {
    ch: "ا",
    key: "alif",
    name: "Alif",
    nameAr: "أَلِف",
    tr: "a",
    connects: false,
    family: "alif",
    sound: 'Alif has no sound of its own. It carries the vowel, like the "a" in "apple".',
    tip: "A straight stick, standing tall. It never joins to the letter after it.",
  },
  {
    ch: "ب",
    key: "ba",
    name: "Ba",
    nameAr: "بَاء",
    tr: "b",
    connects: true,
    family: "boat",
    qalqala: true,
    sound: '"b" as in ball. Press your lips together, then let go.',
    tip: "A boat with one dot underneath.",
  },
  {
    ch: "ت",
    key: "ta",
    name: "Ta",
    nameAr: "تَاء",
    tr: "t",
    connects: true,
    family: "boat",
    sound: '"t" as in tap. Tongue tip touches behind your top teeth.',
    tip: "Same boat as Ba, but two dots on top.",
  },
  {
    ch: "ث",
    key: "tha",
    name: "Tha",
    nameAr: "ثَاء",
    tr: "th",
    connects: true,
    family: "boat",
    sound: '"th" as in "think". Put the tip of your tongue between your teeth and blow softly.',
    tip: "Same boat, three dots on top like a little tent.",
  },
  {
    ch: "ج",
    key: "jeem",
    name: "Jeem",
    nameAr: "جِيم",
    tr: "j",
    connects: true,
    family: "hook",
    qalqala: true,
    sound: '"j" as in jam.',
    tip: "A hook with a dot inside the curve.",
  },
  {
    ch: "ح",
    key: "hha",
    name: "Haa",
    nameAr: "حَاء",
    tr: "H",
    connects: true,
    family: "hook",
    sound: 'A breathy "h" from the middle of your throat, like fogging up a mirror.',
    tip: "Same hook as Jeem, no dot at all.",
  },
  {
    ch: "خ",
    key: "kha",
    name: "Kha",
    nameAr: "خَاء",
    tr: "kh",
    connects: true,
    family: "hook",
    heavy: true,
    sound: 'A rough "kh" from the top of your throat, like clearing it gently.',
    tip: "Same hook, one dot on top. Read it thick.",
  },
  {
    ch: "د",
    key: "dal",
    name: "Dal",
    nameAr: "دَال",
    tr: "d",
    connects: false,
    family: "dal",
    qalqala: true,
    sound: '"d" as in door. Tongue tip on your top teeth.',
    tip: "A small bent elbow. It never joins forward.",
  },
  {
    ch: "ذ",
    key: "dhal",
    name: "Dhal",
    nameAr: "ذَال",
    tr: "dh",
    connects: false,
    family: "dal",
    sound: '"th" as in "this". Tongue tip between the teeth, voice on.',
    tip: "Same elbow as Dal, one dot on top.",
  },
  {
    ch: "ر",
    key: "ra",
    name: "Ra",
    nameAr: "رَاء",
    tr: "r",
    connects: false,
    family: "ra",
    sound: 'A rolled "r". Tap your tongue once behind the top teeth.',
    tip: "A smile that dips below the line. Never joins forward.",
  },
  {
    ch: "ز",
    key: "zay",
    name: "Zay",
    nameAr: "زَاي",
    tr: "z",
    connects: false,
    family: "ra",
    sound: '"z" as in zoo.',
    tip: "Same dip as Ra, one dot on top.",
  },
  {
    ch: "س",
    key: "seen",
    name: "Seen",
    nameAr: "سِين",
    tr: "s",
    connects: true,
    family: "seen",
    sound: '"s" as in sun.',
    tip: "Three little teeth and a bowl.",
  },
  {
    ch: "ش",
    key: "sheen",
    name: "Sheen",
    nameAr: "شِين",
    tr: "sh",
    connects: true,
    family: "seen",
    sound: '"sh" as in ship.',
    tip: "Same teeth as Seen, three dots on top.",
  },
  {
    ch: "ص",
    key: "saad",
    name: "Saad",
    nameAr: "صَاد",
    tr: "S",
    connects: true,
    family: "sad",
    heavy: true,
    sound: 'A heavy "s". Round your mouth and fill it with the sound.',
    tip: "A loop, then a bowl. Read it thick.",
  },
  {
    ch: "ض",
    key: "daad",
    name: "Daad",
    nameAr: "ضَاد",
    tr: "D",
    connects: true,
    family: "sad",
    heavy: true,
    sound: 'A heavy "d". The side of your tongue presses the upper back teeth.',
    tip: "Same loop as Saad, one dot on top. Read it thick.",
  },
  {
    ch: "ط",
    key: "taa",
    name: "Taa",
    nameAr: "طَاء",
    tr: "T",
    connects: true,
    family: "ta",
    heavy: true,
    qalqala: true,
    sound: 'A heavy "t" with a full mouth.',
    tip: "A loop with a stick standing on it. Read it thick.",
  },
  {
    ch: "ظ",
    key: "zaa",
    name: "Zaa",
    nameAr: "ظَاء",
    tr: "Z",
    connects: true,
    family: "ta",
    heavy: true,
    sound: 'A heavy "th" as in "this", with a full mouth.',
    tip: "Same as Taa, one dot on top. Read it thick.",
  },
  {
    ch: "ع",
    key: "ayn",
    name: "Ayn",
    nameAr: "عَيْن",
    tr: "'",
    connects: true,
    family: "ayn",
    sound: "A squeeze from the middle of your throat. There is no English letter for it.",
    tip: "An open mouth shape on top, a bowl below.",
  },
  {
    ch: "غ",
    key: "ghayn",
    name: "Ghayn",
    nameAr: "غَيْن",
    tr: "gh",
    connects: true,
    family: "ayn",
    heavy: true,
    sound: '"gh", like a soft gargle at the top of the throat.',
    tip: "Same as Ayn, one dot on top. Read it thick.",
  },
  {
    ch: "ف",
    key: "fa",
    name: "Fa",
    nameAr: "فَاء",
    tr: "f",
    connects: true,
    family: "fa",
    sound: '"f" as in fish. Top teeth on your bottom lip.',
    tip: "A small loop with one dot on top, then a flat tail.",
  },
  {
    ch: "ق",
    key: "qaf",
    name: "Qaf",
    nameAr: "قَاف",
    tr: "q",
    connects: true,
    family: "fa",
    heavy: true,
    qalqala: true,
    sound: 'A deep "k" from the very back of your tongue.',
    tip: "Same loop as Fa, two dots on top, and a round tail that dips down. Read it thick.",
  },
  {
    ch: "ك",
    key: "kaf",
    name: "Kaf",
    nameAr: "كَاف",
    tr: "k",
    connects: true,
    family: "kaf",
    sound: '"k" as in kite.',
    tip: "A tall stroke with a little mark inside.",
  },
  {
    ch: "ل",
    key: "lam",
    name: "Lam",
    nameAr: "لَام",
    tr: "l",
    connects: true,
    family: "lam",
    sound: '"l" as in lamp.',
    tip: "A tall stick that bends into a bowl.",
  },
  {
    ch: "م",
    key: "meem",
    name: "Meem",
    nameAr: "مِيم",
    tr: "m",
    connects: true,
    family: "meem",
    ghunna: true,
    sound: '"m" as in moon. Lips closed, hum through your nose.',
    tip: "A small round head with a tail going straight down.",
  },
  {
    ch: "ن",
    key: "noon",
    name: "Noon",
    nameAr: "نُون",
    tr: "n",
    connects: true,
    family: "boat",
    ghunna: true,
    sound: '"n" as in nose.',
    tip: "A deep bowl with one dot on top. When joined, it looks like Ba with the dot above.",
  },
  {
    ch: "و",
    key: "waw",
    name: "Waw",
    nameAr: "وَاو",
    tr: "w",
    connects: false,
    family: "waw",
    sound: '"w" as in water. Round your lips.',
    tip: "A head with a tail that dips below. Never joins forward.",
  },
  {
    ch: "ه",
    key: "ha",
    name: "Ha",
    nameAr: "هَاء",
    tr: "h",
    connects: true,
    family: "ha",
    sound: 'A soft "h" as in "hat", from deep in the throat.',
    tip: "A little circle. It changes shape a lot when it joins.",
  },
  {
    ch: "ء",
    key: "hamza",
    name: "Hamza",
    nameAr: "هَمْزَة",
    tr: "'",
    connects: false,
    family: "hamza",
    sound: 'A tiny stop in the throat, like the catch in the middle of "uh-oh".',
    tip: "A small hook that often sits on top of Alif, Waw or Ya.",
  },
  {
    ch: "ي",
    key: "ya",
    name: "Ya",
    nameAr: "يَاء",
    tr: "y",
    connects: true,
    family: "boat",
    sound: '"y" as in yes.',
    tip: "A boat with two dots underneath, and a tail that swings back.",
  },
  {
    ch: "ى",
    key: "alif-maqsura",
    name: "Tail Ya (no dots)",
    nameAr: "أَلِف مَقْصُورَة",
    tr: "aa",
    connects: true,
    family: "boat",
    sound: 'Ya at the end of a word with no dots. It is read like a long "aa".',
    tip: "Only appears at the end of a word.",
  },
]

export const LETTER_BY_CHAR: Record<string, Letter> = Object.fromEntries(
  LETTERS.map((l) => [l.ch, l]),
)

/** The seven thick letters (the book's green). */
export const HEAVY = ["خ", "ص", "ض", "ط", "ظ", "غ", "ق"]
/** The five bouncing letters, "qutub jad". */
export const QALQALA = ["ق", "ط", "ب", "ج", "د"]
/** The two letters that hum when doubled or sakin. */
export const GHUNNA = ["ن", "م"]

/** Letters that take a vowel in the systematic drills: every letter except Alif, Hamza and the dotless Ya. */
export const SPEAKERS = LETTERS.filter(
  (l) => !["alif", "hamza", "alif-maqsura"].includes(l.key),
).map((l) => l.ch)
