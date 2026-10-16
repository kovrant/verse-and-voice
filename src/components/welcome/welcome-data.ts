/**
 * Content for the /welcome landing page, ported 1:1 from the approved Claude
 * Design mock ("Verse and Voice.dc.html"). Keep copy changes here, layout in
 * welcome-story.tsx.
 */

/**
 * Where "Your story begins tonight" sends parents.
 */
// ponytail: hard-coded contact links; upgrade path is a settings row the teacher edits.
export const CONTACT = {
  // wa.me opens a chat with the greeting already typed; parents just press send.
  whatsapp:
    "https://wa.me/923310438768?text=Assalamu%20Alaikum%21%20I%27d%20like%20to%20book%20a%20free%20trial%20Quran%20class%20with%20Verse%20%26%20Voice%20for%20my%20child.",
  instagram: "https://www.instagram.com/verseandvoicequran/",
  facebook: "https://www.facebook.com/verseandvoicequran",
}

export type AgeBand = "little" | "young" | "teens"

export const AGES: [AgeBand, string, string][] = [
  ["little", "Little Readers", "4–8"],
  ["young", "Young Reciters", "9–13"],
  ["teens", "Teens", "14+"],
]

export const HEADLINES: Record<AgeBand, string> = {
  little: "Every great story starts with one letter.",
  young: "From your first letter to your first whole surah.",
  teens: "Your Quran journey. Your pace. Your voice.",
}

/** Sky colour stops from chapter 7 (dusk) to chapter 10 (night). */
export const SKY: [number, number, number][] = [
  [248, 246, 238],
  [236, 221, 196],
  [150, 128, 104],
  [48, 58, 50],
  [18, 22, 18],
]

export const TINTS = [
  "#8FA97A",
  "#7FA3B8",
  "#9D8BB5",
  "#C9A06B",
  "#D98363",
  "#E3B04B",
  "#6FA3A0",
  "#C98A8A",
]

export const NAV = [
  "Dawn",
  "The first letters",
  "A voice on the line",
  "Para by para",
  "Words that stay",
  "Pray with me",
  "Stars you earn",
  "Stories from long ago",
  "For the grown-ups",
  "Your story begins tonight",
]

export const BUBBLES = [
  "Assalamu Alaikum!",
  "Alif, Baa, Taa!",
  "I'm all ears.",
  "One para at a time.",
  "Say it again with me.",
  "Allahu Akbar.",
  "MashaAllah, a new badge!",
  "Once upon a time…",
  "Hello, grown-ups!",
  "Goodnight. See you in class.",
]

/** Deterministic 0..1 noise so server and client render the same scatter. */
export const rnd = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: (rnd(i) * 100).toFixed(2),
  y: (rnd(i + 100) * 100).toFixed(2),
  s: (1 + rnd(i + 200) * 2.4).toFixed(1),
  d: (2 + rnd(i + 300) * 4).toFixed(1),
  dl: (rnd(i + 400) * 4).toFixed(1),
}))

export const DOODLES = Array.from({ length: 16 }, (_, i) => ({
  g: ["✦", "☾", "•", "☁"][i % 4],
  c: TINTS[i % 8],
  x: (3 + rnd(i + 500) * 94).toFixed(1),
  y: (6 + rnd(i + 600) * 88).toFixed(1),
  s: Math.round(14 + rnd(i + 700) * 18),
  d: (6 + rnd(i + 800) * 6).toFixed(1),
  dl: (rnd(i + 900) * 5).toFixed(1),
}))

/** The thirty juz, each by the opening words it is known by. Review: typed by hand. */
export const JUZ_NAMES = [
  "الم",
  "سيقول",
  "تلك الرسل",
  "لن تنالوا",
  "والمحصنات",
  "لا يحب الله",
  "وإذا سمعوا",
  "ولو أننا",
  "قال الملأ",
  "واعلموا",
  "يعتذرون",
  "وما من دابة",
  "وما أبرئ",
  "ربما",
  "سبحان الذي",
  "قال ألم",
  "اقترب للناس",
  "قد أفلح",
  "وقال الذين",
  "أمن خلق",
  "اتل ما أوحي",
  "ومن يقنت",
  "وما لي",
  "فمن أظلم",
  "إليه يرد",
  "حم",
  "قال فما خطبكم",
  "قد سمع الله",
  "تبارك الذي",
  "عم",
]

export const SCENES = [
  {
    a: "⛵",
    b: "🌊",
    alt: "A small boat on the waves",
    v: "Patience",
    deg: -50,
    t: "Prophet Yunus (peace be upon him) sailed away from his town, sad that the people would not listen to his message.",
  },
  {
    a: "🐋",
    b: "🌑",
    alt: "A great whale in the dark sea",
    v: "Turning to Allah",
    deg: 40,
    t: 'A storm rose, and a great whale swallowed him. In the dark, he called out: "There is no god but You. Glory be to You."',
  },
  {
    a: "🏝️",
    b: "🌿",
    alt: "A quiet shore with a shady plant",
    v: "Gratitude",
    deg: 130,
    t: "Allah heard him. The whale left him safe on the shore, and a plant grew to shade him while he grew strong again.",
  },
]

/** September mock calendar: two leading blanks, class days Mon/Wed/Fri/Sat, one missed day. */
export const CAL = (() => {
  const c: { d: number | ""; dot: string; ring: string }[] = [
    { d: "", dot: "transparent", ring: "transparent" },
    { d: "", dot: "transparent", ring: "transparent" },
  ]
  for (let d = 1; d <= 30; d++) {
    const wd = (d + 1) % 7
    const cls = [0, 2, 4, 5].includes(wd)
    const past = d <= 24
    const missed = d === 17
    c.push({
      d,
      dot: cls && past && !missed ? "#6B7F5B" : "transparent",
      ring: cls && (!past || missed) ? "#C9B79C" : "transparent",
    })
  }
  return c
})()

export const FATIHA = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
  "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "مَٰلِكِ يَوْمِ ٱلدِّينِ",
  "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
]

/** Pages the chapter-3 demo turns through: the teacher taps, the student's page follows. */
export const MUSHAF_PAGES: { surah: string; page: number; lines: string[] }[] = [
  { surah: "Al-Fatiha", page: 1, lines: FATIHA },
  {
    surah: "Al-Baqarah",
    page: 2,
    lines: [
      "الٓمٓ",
      "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ",
      "هُدًى لِّلْمُتَّقِينَ",
      "ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ",
      "وَيُقِيمُونَ ٱلصَّلَوٰةَ",
    ],
  },
  {
    surah: "Al-Ikhlas",
    page: 3,
    lines: [
      "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
      "ٱللَّهُ ٱلصَّمَدُ",
      "لَمْ يَلِدْ وَلَمْ يُولَدْ",
      "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
    ],
  },
]

export const IKHLAS = [
  "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
  "ٱللَّهُ ٱلصَّمَدُ",
  "لَمْ يَلِدْ وَلَمْ يُولَدْ",
  "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
]

export const HADITH_AR = "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ"

/* ponytail: the design's placeholder quotes; swap for real parent words before launch. */
export const QUOTES = [
  {
    q: "My daughter reminds me when it's class time now, and I love that there is no camera.",
    who: "Sana, Manchester 🇬🇧",
  },
  {
    q: "The monthly report tells me exactly where my son is, para by para.",
    who: "Omar, Toronto 🇨🇦",
  },
  {
    q: "Lessons show in our own time, so we haven't missed one since we started.",
    who: "Mariam, Sydney 🇦🇺",
  },
]
