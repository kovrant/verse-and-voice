import { ayah, celebrate, check, exercise, rule } from "../builders"
import type { Unit } from "../types"

const U = 10

type AyahRow = [string, string, string[]]

const FATIHA: AyahRow[] = [
  [
    "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ",
    "bismillaahir raHmaanir raHeem",
    ["thin Lam of Allah", "melting Lam into Ra", "standing fatha"],
  ],
  [
    "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ",
    "alHamdu lillaahi rabbil 'aalameen",
    ["sukoon", "shaddah", "stop with sukoon"],
  ],
  ["الرَّحْمٰنِ الرَّحِيْمِ", "ar-raHmaanir raHeem", ["melting Lam", "madd"]],
  [
    "مٰلِكِ يَوْمِ الدِّيْنِ",
    "maaliki yawmid deen",
    ["standing fatha", "leen", "melting Lam into Dal"],
  ],
  [
    "اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِيْنُ",
    "iyyaaka na'budu wa iyyaaka nasta'een",
    ["shaddah on Ya", "sukoon", "madd"],
  ],
  [
    "اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيْمَ",
    "ihdinaS SiraaTal mustaqeem",
    ["heavy Saad and Taa", "melting Lam into Saad"],
  ],
  [
    "صِرَاطَ الَّذِيْنَ اَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوْبِ عَلَيْهِمْ وَلَا الضَّآلِّيْنَ",
    "SiraaTal ladheena an'amta 'alayhim ghayril maghDoobi 'alayhim wa laD-Daaalleen",
    ["clear Noon", "leen", "six-count madd"],
  ],
]

const IKHLAS: AyahRow[] = [
  [
    "قُلْ هُوَ اللّٰهُ اَحَدٌ",
    "qul huwallaahu aHad",
    ["sukoon on Lam", "thick Lam of Allah", "stop: tanween becomes sukoon"],
  ],
  ["اَللّٰهُ الصَّمَدُ", "allaahuS Samad", ["melting Lam into Saad", "heavy Saad"]],
  [
    "لَمْ يَلِدْ وَلَمْ يُوْلَدْ",
    "lam yalid wa lam yoolad",
    ["clear Meem sakin", "bouncing Dal at the stop"],
  ],
  [
    "وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ",
    "wa lam yakul-lahoo kufuwan aHad",
    ["melting Noon into Lam", "upside-down damma"],
  ],
]

const NAS: AyahRow[] = [
  [
    "قُلْ اَعُوْذُ بِرَبِّ النَّاسِ",
    "qul a'oodhu birabbin naas",
    ["madd", "shaddah", "melting Lam into Noon with hum"],
  ],
  ["مَلِكِ النَّاسِ", "malikin naas", ["melting Lam into Noon"]],
  ["اِلٰهِ النَّاسِ", "ilaahin naas", ["standing fatha"]],
  [
    "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
    "min sharril waswaasil khannaas",
    ["hidden Noon", "heavy Kha", "humming doubled Noon"],
  ],
  [
    "الَّذِيْ يُوَسْوِسُ فِيْ صُدُوْرِ النَّاسِ",
    "alladhee yuwaswisu fee Sudoorin naas",
    ["madd", "heavy Saad"],
  ],
  ["مِنَ الْجِنَّةِ وَالنَّاسِ", "minal jinnati wan naas", ["humming doubled Noon", "round Ta"]],
]

const sura = (slug: string, rows: AyahRow[]) =>
  rows.map(([ar, tr, rules], i) => ayah(U, slug, i + 1, ar, tr, rules))

const DETECTIVE_OPTIONS = [
  "shaddah on Ya",
  "clear Noon",
  "six-count madd",
  "hidden Noon",
  "melting Noon into Lam",
  "humming doubled Noon",
]

function build(): Unit {
  const total = FATIHA.length + IKHLAS.length + NAS.length
  return {
    number: U,
    slug: "quran",
    title: "Read the Quran",
    goal: "Read Al-Fatiha, Al-Ikhlas and An-Nas with every rule in place.",
    why: "The reward is real reading, not a certificate. Every ayah shows the rules inside it, so the child sees that the whole course was for this.",
    steps: [
      {
        title: "Before you begin",
        cards: [
          rule(
            U,
            "graduation",
            "You can read the Quran",
            "Everything in these three surahs is something you have learned. Read one ayah at a time. Under each ayah you will see which rules are inside it. Your teacher will help with the first reading, then you read it alone.",
            {
              teacher:
                "Read each ayah once as a model, then let the child read. Mark each ayah mastered only when the rules listed under it are heard.",
            },
          ),
        ],
      },
      { title: "Surah Al-Fatiha", cards: sura("fatiha", FATIHA) },
      { title: "Surah Al-Ikhlas", cards: sura("ikhlas", IKHLAS) },
      { title: "Surah An-Nas", cards: sura("nas", NAS) },
      {
        title: "Final check",
        cards: [
          exercise(
            U,
            "rule-detective",
            "rule-detective",
            "Find the rule in the ayah.",
            (
              [
                ["اِيَّاكَ نَعْبُدُ", "shaddah on Ya"],
                ["اَنْعَمْتَ", "clear Noon"],
                ["وَلَا الضَّآلِّيْنَ", "six-count madd"],
                ["مِنْ شَرِّ", "hidden Noon"],
                ["يَكُنْ لَّهٗ", "melting Noon into Lam"],
                ["الْخَنَّاسِ", "humming doubled Noon"],
              ] as const
            ).map(([ar, ans]) => ({ arabic: ar, options: DETECTIVE_OPTIONS, answer: ans })),
          ),
          check(
            U,
            "Read all three surahs",
            [{ kind: "read-aloud", count: total, from: "every ayah, teacher marks each" }],
            `${total} of ${total}`,
          ),
          celebrate(U, "You finished the Qaida and read the Quran!", 3, { finale: true }),
        ],
      },
    ],
  }
}

export const UNIT_10 = build()
