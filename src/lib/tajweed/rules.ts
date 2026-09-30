export type TajweedCategory =
  | "harakaat"
  | "echo_nasal"
  | "madd"
  | "noon_meem"
  | "heavy_light"
  | "makharij"
  | "waqf"

export type KidCrayonColor =
  | "sage"
  | "coral"
  | "caramel"
  | "saffron"
  | "sky"
  | "teal"
  | "rose"
  | "lavender"

export interface TajweedExample {
  arabic: string
  transliteration: string
  highlight?: string
  note?: string
}

export interface TajweedRule {
  id: string
  slug: string
  title: string
  shortTitle: string
  nameUrdu: string
  nameArabic: string
  category: TajweedCategory
  arabicSymbol: string
  rhythmBadge: string
  doSay: string
  dontSay: string
  shortCue: string
  explanation: string
  commonMistake: string
  examples: TajweedExample[]
  color: KidCrayonColor
  isQuickPick?: boolean
}

export const TAJWEED_CATEGORIES: { id: TajweedCategory; label: string; icon: string }[] = [
  { id: "harakaat", label: "Harakaat (حرکات)", icon: "✏️" },
  { id: "echo_nasal", label: "Qalqalah & Ghunnah (قلقلہ و غنہ)", icon: "🔔" },
  { id: "madd", label: "Madd (مد - کھینچنا)", icon: "〰️" },
  { id: "noon_meem", label: "Noon & Meem (نون و میم)", icon: "🔄" },
  { id: "heavy_light", label: "Heavy & Light (پُر و باریک)", icon: "⚖️" },
  { id: "makharij", label: "Confused Letters (حروف)", icon: "🗣️" },
  { id: "waqf", label: "Waqf / Stop (رموزِ اوقاف)", icon: "🛑" },
]

export const TAJWEED_RULES: TajweedRule[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Category 1: Harakaat & Vowels
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "zabar",
    slug: "zabar",
    title: "Zabar (Fathah)",
    shortTitle: "Zabar",
    nameUrdu: "زَبَر",
    nameArabic: "فَتْحَة",
    category: "harakaat",
    arabicSymbol: "بَ",
    rhythmBadge: "⚡ 1 Beat · Quick!",
    doSay: "Ba (Quick!)",
    dontSay: "Baaa (No stretch)",
    shortCue: "Keep it short! Don't stretch into an Alif.",
    explanation:
      "A Zabar produces a quick, crisp 'A' sound. Read it smoothly without dragging or pulling.",
    commonMistake: "Stretching it like an Alif (e.g. saying 'Baa' instead of 'Ba').",
    examples: [
      { arabic: "دَرَسَ", transliteration: "Da · ra · sa", note: "3 quick, even Zabar sounds" },
      { arabic: "كَتَبَ", transliteration: "Ka · ta · ba", note: "Don't pull any letter" },
    ],
    color: "coral",
    isQuickPick: true,
  },
  {
    id: "zer",
    slug: "zer",
    title: "Zer (Kasrah)",
    shortTitle: "Zer",
    nameUrdu: "زِیر",
    nameArabic: "كَسْرَة",
    category: "harakaat",
    arabicSymbol: "بِ",
    rhythmBadge: "😊 Smile · 1 Beat!",
    doSay: "Bi (Sharp!)",
    dontSay: "Beee / Bay",
    shortCue: "Smile and keep it short! Don't stretch into a Yaa.",
    explanation:
      "A Zer produces a short 'I' sound (as in 'bit'). Drop your lower jaw slightly without dragging.",
    commonMistake: "Turning it into an Urdu 'ay' sound or stretching it into Yaa Maddah.",
    examples: [
      { arabic: "إِبِلِ", transliteration: "I · bi · li", note: "Sharp 'I' sounds, do not stretch" },
      { arabic: "شَهِدَ", transliteration: "Sha · hi · da", note: "Middle letter 'hi' is quick" },
    ],
    color: "teal",
    isQuickPick: true,
  },
  {
    id: "pesh",
    slug: "pesh",
    title: "Pesh (Dammah)",
    shortTitle: "Pesh",
    nameUrdu: "پیش",
    nameArabic: "ضَمَّة",
    category: "harakaat",
    arabicSymbol: "بُ",
    rhythmBadge: "😗 Round Lips · 1 Beat!",
    doSay: "Bu (Round lips)",
    dontSay: "Booo / Bo",
    shortCue: "Round your lips! Don't stretch into a Waw.",
    explanation:
      "A Pesh produces a short 'U' sound (as in 'put'). Round your lips completely and release quickly.",
    commonMistake: "Pronouncing it like a flat English 'O' or pulling it into a Waw.",
    examples: [
      { arabic: "رُسُلُ", transliteration: "Ru · su · lu", note: "Round lips for each letter" },
      { arabic: "خُلِقَ", transliteration: "Khu · li · qa", note: "First letter 'Khu' is short" },
    ],
    color: "sky",
    isQuickPick: true,
  },
  {
    id: "khari-zabar",
    slug: "khari-zabar",
    title: "Khari Zabar (Standing Fathah)",
    shortTitle: "Khari Zabar",
    nameUrdu: "کھڑی زَبَر",
    nameArabic: "فَتْحَة مُقَدَّرَة",
    category: "harakaat",
    arabicSymbol: "بٰ",
    rhythmBadge: "✌️ Stretch 2 Counts",
    doSay: "Baa (1 – 2)",
    dontSay: "Ba (Too short)",
    shortCue: "Stretch for 1 Alif (2 counts/seconds).",
    explanation:
      "A Khari Zabar is equal to an Alif Maddah. Stretch the sound gently for 2 counts.",
    commonMistake: "Reading it too short like a normal Zabar or over-stretching beyond 2 counts.",
    examples: [
      { arabic: "مٰلِكِ", transliteration: "Maa · li · ki", note: "Stretch 'Maa' for 2 counts" },
      { arabic: "إِلٰهِ", transliteration: "I · laa · hi", note: "Stretch 'laa' for 2 counts" },
    ],
    color: "saffron",
    isQuickPick: false,
  },
  {
    id: "khari-zer",
    slug: "khari-zer",
    title: "Khari Zer (Standing Kasrah)",
    shortTitle: "Khari Zer",
    nameUrdu: "کھڑی زِیر",
    nameArabic: "كَسْرَة مُقَدَّرَة",
    category: "harakaat",
    arabicSymbol: "بٖ",
    rhythmBadge: "✌️ Stretch 2 Counts",
    doSay: "Beee (1 – 2)",
    dontSay: "Bi (Too short)",
    shortCue: "Stretch for 1 Yaa (2 counts/seconds).",
    explanation:
      "A Khari Zer is equal to a Yaa Maddah. Stretch the 'Ee' sound gently for 2 counts.",
    commonMistake: "Reading it fast like a normal Zer without elongation.",
    examples: [
      { arabic: "بِهٖ", transliteration: "Bi · hee", note: "Stretch 'hee' with Khari Zer for 2 counts" },
      { arabic: "عِبَادِهٖ", transliteration: "I · baa · di · hee", note: "Khari Zer on Haa stretched for 2 counts" },
      { arabic: "فِيهٖ", transliteration: "Fee · hee", note: "Stretch 'hee' with Khari Zer for 2 counts" },
    ],
    color: "teal",
    isQuickPick: false,
  },
  {
    id: "ulta-pesh",
    slug: "ulta-pesh",
    title: "Ulta Pesh (Inverted Dammah)",
    shortTitle: "Ulta Pesh",
    nameUrdu: "اُلٹا پیش",
    nameArabic: "ضَمَّة مُقَلَّبَة",
    category: "harakaat",
    arabicSymbol: "بٗ",
    rhythmBadge: "✌️ Round & Stretch 2",
    doSay: "Booo (1 – 2)",
    dontSay: "Bu (Too short)",
    shortCue: "Round lips and stretch for 2 counts.",
    explanation:
      "An Ulta Pesh is equal to a Waw Maddah. Round your lips and stretch the 'Oo' sound for 2 counts.",
    commonMistake: "Skipping the stretch and reading it like a normal short Pesh.",
    examples: [
      { arabic: "لَهٗ", transliteration: "La · hoo", note: "Stretch 'hoo' with Ulta Pesh for 2 counts" },
      { arabic: "دَاوٗدُ", transliteration: "Daa · woo · du", note: "Stretch 'woo' with Ulta Pesh for 2 counts" },
      { arabic: "رَسُولُهٗ", transliteration: "Ra · soo · lu · hoo", note: "Stretch 'hoo' with Ulta Pesh for 2 counts" },
    ],
    color: "sky",
    isQuickPick: false,
  },
  {
    id: "sukoon",
    slug: "sukoon",
    title: "Sukoon / Jazm (Rest Mark)",
    shortTitle: "Sukoon / Jazm",
    nameUrdu: "جزم / سکون",
    nameArabic: "سُكُون",
    category: "harakaat",
    arabicSymbol: "أَبْ",
    rhythmBadge: "🛑 Join & Rest Firmly",
    doSay: "An · 'am (Clean rest)",
    dontSay: "An-a (Extra vowel)",
    shortCue: "Stop firmly on the letter! No bounce (unless Qalqalah).",
    explanation:
      "Sukoon indicates a resting letter without a vowel. Join the previous vowel to this letter firmly.",
    commonMistake: "Adding an extra phantom vowel sound (e.g. saying 'Ab-a' instead of 'Ab').",
    examples: [
      { arabic: "أَنْعَمْتَ", transliteration: "An · 'am · ta", note: "Stop cleanly on Noon and Meem" },
      { arabic: "يَعْلَمُ", transliteration: "Ya' · la · mu", note: "Firm rest on Ayn" },
    ],
    color: "sage",
    isQuickPick: true,
  },
  {
    id: "tashdeed",
    slug: "tashdeed",
    title: "Tashdeed / Shaddah",
    shortTitle: "Tashdeed",
    nameUrdu: "تشدید",
    nameArabic: "شَدَّة",
    category: "harakaat",
    arabicSymbol: "رَبِّ",
    rhythmBadge: "💪 Press Twice · Strong!",
    doSay: "Rab-bi (Hold + release)",
    dontSay: "Ra-bi (Too weak)",
    shortCue: "Read with double strength and emphasis!",
    explanation:
      "A letter with Tashdeed is read twice: first with Sukoon (hold), then with the Harakah (release).",
    commonMistake: "Gliding over it like a single letter without the hold and emphasis.",
    examples: [
      { arabic: "إِيَّاكَ", transliteration: "Iy · yaa · ka", note: "Press firmly on Yaa" },
      { arabic: "رَبِّ", transliteration: "Rab · bi", note: "Hold the Baa before the Zer" },
    ],
    color: "coral",
    isQuickPick: true,
  },
  {
    id: "tanween",
    slug: "tanween",
    title: "Tanween (Double Vowels)",
    shortTitle: "Tanween",
    nameUrdu: "تنوين",
    nameArabic: "تَنْوِين",
    category: "harakaat",
    arabicSymbol: "بًا بٍ بٌ",
    rhythmBadge: "🔔 'N' Sound (An · In · Un)",
    doSay: "Ban · Bin · Bun",
    dontSay: "Baa (Missing 'N')",
    shortCue: "Produces an 'N' ending (An, In, Un).",
    explanation:
      "Tanween is two Zabars, two Zers, or two Peshs. It adds a hidden Noon Saakin sound at the end.",
    commonMistake: "Missing the 'N' sound or over-stretching.",
    examples: [
      { arabic: "كِتٰبٌ", transliteration: "Ki · taa · bun", note: "Pesh Tanween = 'un'" },
      { arabic: "عَلِيمًا", transliteration: "'A · lee · man", note: "Zabar Tanween = 'an'" },
    ],
    color: "caramel",
    isQuickPick: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 2: Echo & Nasal Sounds
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "qalqalah",
    slug: "qalqalah",
    title: "Qalqalah (Echo Letters: ق ط ب ج د)",
    shortTitle: "Qalqalah",
    nameUrdu: "قلقلہ",
    nameArabic: "قَلْقَلَة",
    category: "echo_nasal",
    arabicSymbol: "ق ط ب ج د",
    rhythmBadge: "🏀 Bounce Sound!",
    doSay: "Ahad-d (Bounce!)",
    dontSay: "Ahad-da (Extra Zabar)",
    shortCue: "Bounce the sound! Crisp echo on Sukoon.",
    explanation:
      "When any of the 5 Qalqalah letters (ق, ط, ب, ج, د) has a Sukoon or is stopped upon, bounce it crisply.",
    commonMistake: "Turning the bounce into an extra vowel (Zabar) or suffocating the letter.",
    examples: [
      { arabic: "ٱلْفَلَقْ", transliteration: "Al · Fa · laq", note: "Sharp echo at the stop" },
      { arabic: "أَحَدْ", transliteration: "A · had", note: "Bounce the Daal" },
      { arabic: "حَبْلٌ", transliteration: "Hab · lun", note: "Bounce on the middle Baa" },
    ],
    color: "rose",
    isQuickPick: true,
  },
  {
    id: "ghunnah",
    slug: "ghunnah",
    title: "Ghunnah (Nasal Hum on نّ and مّ)",
    shortTitle: "Ghunnah",
    nameUrdu: "غُنَّہ",
    nameArabic: "غُنَّة",
    category: "echo_nasal",
    arabicSymbol: "نّ  مّ",
    rhythmBadge: "👃 Nose Hum · 2 Counts",
    doSay: "Innn-na (Hold 2s)",
    dontSay: "In-na (Too fast)",
    shortCue: "Hold the sweet nasal hum for 2 counts!",
    explanation:
      "Whenever Noon (نّ) or Meem (مّ) has a Tashdeed, hold the sound in your nose for 2 counts before releasing.",
    commonMistake: "Rushing past Noon or Meem without holding the 2-count nasal resonance.",
    examples: [
      { arabic: "إِنَّ", transliteration: "Innn · na", note: "Hold the 'nnn' sound for 2 counts" },
      { arabic: "ثُمَّ", transliteration: "Thummm · ma", note: "Hold the 'mmm' sound for 2 counts" },
    ],
    color: "lavender",
    isQuickPick: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 3: Madd (Elongation)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "madd-asli",
    slug: "madd-asli",
    title: "Madd Asli (Natural Elongation)",
    shortTitle: "Madd (2 Counts)",
    nameUrdu: "مدِّ اصلی",
    nameArabic: "مَدّ طَبِيعِيّ",
    category: "madd",
    arabicSymbol: "بَا بِي بُو",
    rhythmBadge: "〰️ Stretch 2 Counts",
    doSay: "Qaa-la (1 – 2)",
    dontSay: "Qa-la (Too short)",
    shortCue: "Gently stretch for exactly 2 counts (1 Alif).",
    explanation:
      "Alif preceded by Zabar, Yaa preceded by Zer, or Waw preceded by Pesh. Stretch for 2 counts.",
    commonMistake: "Reading too fast (chopping to 1 count) or over-stretching to 4 counts.",
    examples: [
      { arabic: "قَالَ", transliteration: "Qaa · la", note: "2 counts on 'Qaa'" },
      { arabic: "نُوحِيهَا", transliteration: "Noo · hee · haa", note: "All three natural Madd letters!" },
    ],
    color: "saffron",
    isQuickPick: true,
  },
  {
    id: "madd-muttasil",
    slug: "madd-muttasil",
    title: "Madd Muttasil (Connected Madd)",
    shortTitle: "Madd Muttasil",
    nameUrdu: "مدِّ متصل",
    nameArabic: "مَدّ مُتَّصِل",
    category: "madd",
    arabicSymbol: "جَآءَ",
    rhythmBadge: "🌊 Stretch 4 Counts!",
    doSay: "Jaaaa-'a (1-2-3-4)",
    dontSay: "Jaa-'a (Too short)",
    shortCue: "Stretch for 4 to 5 counts! (Same word with Hamza).",
    explanation:
      "When a Madd letter is followed by a Hamza in the SAME word. Must be stretched 4-5 counts.",
    commonMistake: "Under-stretching like a normal 2-count Madd.",
    examples: [
      { arabic: "جَآءَ", transliteration: "Jaaaa · 'a", note: "Stretch 'Jaa' for 4-5 counts" },
      { arabic: "السَّمَآءِ", transliteration: "As · Samaaaa · 'i", note: "Wavy mark = 4-5 counts" },
    ],
    color: "saffron",
    isQuickPick: false,
  },
  {
    id: "madd-munfasil",
    slug: "madd-munfasil",
    title: "Madd Munfasil (Separated Madd)",
    shortTitle: "Madd Munfasil",
    nameUrdu: "مدِّ منفصل",
    nameArabic: "مَدّ مُنْفَصِل",
    category: "madd",
    arabicSymbol: "فِيٓ أَ",
    rhythmBadge: "🌊 Stretch 3–4 Counts",
    doSay: "Innaaa (1-2-3-4)",
    dontSay: "Inna (No stretch)",
    shortCue: "Stretch for 3 to 4 counts! (Hamza in the next word).",
    explanation:
      "When a Madd letter is at the end of a word and Hamza is at the start of the NEXT word.",
    commonMistake: "Rushing past it without noticing the wavy symbol above the letter.",
    examples: [
      { arabic: "إِنَّآ أَعْطَيْنٰكَ", transliteration: "Innaaa · a'taynaak", note: "Stretch 'Innaaa' before 'a'taynaak" },
      { arabic: "فِيۤ أَنفُسِكُمْ", transliteration: "Feeee · anfusikum", note: "Stretch 'Feeee'" },
    ],
    color: "saffron",
    isQuickPick: false,
  },
  {
    id: "madd-laazim",
    slug: "madd-laazim",
    title: "Madd Laazim (Mandatory 6 Counts)",
    shortTitle: "Big Madd (6)",
    nameUrdu: "مدِّ لازم",
    nameArabic: "مَدّ لَازِم",
    category: "madd",
    arabicSymbol: "ضَآلِّ",
    rhythmBadge: "🖐️ Stretch 6 Full Counts!",
    doSay: "Daaaaall-leen (6s)",
    dontSay: "Daal-leen (Too short)",
    shortCue: "Full 6 counts! Longest stretch in the Quran.",
    explanation:
      "When a Madd letter is followed by a Sukoon or Tashdeed. Obligatory stretch of 6 full counts.",
    commonMistake: "Stopping at 3 or 4 counts instead of giving the full 6 counts.",
    examples: [
      { arabic: "ٱلضَّآلِّينَ", transliteration: "Ad · Daaaaall · leen", note: "6 full counts on Dhaad" },
      { arabic: "الٓمٓ", transliteration: "Alif · Laaaam · Meeeem", note: "6 counts on Laam and Meem" },
    ],
    color: "saffron",
    isQuickPick: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 4: Noon Saakin & Tanween
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ikhfa",
    slug: "ikhfa",
    title: "Ikhfa (Hiding with Nasal Hum)",
    shortTitle: "Ikhfa (Hide 'N')",
    nameUrdu: "اخفاء",
    nameArabic: "إِخْفَاء",
    category: "noon_meem",
    arabicSymbol: "مِن قَبْلُ",
    rhythmBadge: "👃 Hide in Nose · 2 Counts",
    doSay: "Ming-qablu (Soft hum)",
    dontSay: "Min-qablu (Hard 'N')",
    shortCue: "Hide the Noon sound in the nose with a 2-count hum!",
    explanation:
      "When Noon Saakin or Tanween is followed by any of the 15 Ikhfa letters, conceal the Noon with light Ghunnah.",
    commonMistake: "Touching the tongue to the roof of the mouth (making a clear 'N' instead of a soft hum).",
    examples: [
      { arabic: "مِن قَبْلُ", transliteration: "Ming · qab · lu", note: "Soft nasal hum before Qaf" },
      { arabic: "أَنتُمْ", transliteration: "Ang · tum", note: "Do not touch tongue on 'n'" },
    ],
    color: "lavender",
    isQuickPick: false,
  },
  {
    id: "izhar",
    slug: "izhar",
    title: "Izhar (Clear Pronunciation)",
    shortTitle: "Izhar (Clear 'N')",
    nameUrdu: "اظہار",
    nameArabic: "إِظْهَار",
    category: "noon_meem",
    arabicSymbol: "ء ه ع ح غ خ",
    rhythmBadge: "🔔 Clear 'N' · No Hum!",
    doSay: "Man aamana (Crisp N)",
    dontSay: "Mang-aamana (No hum)",
    shortCue: "Read Noon clearly! No humming or stretching.",
    explanation:
      "When Noon Saakin or Tanween meets the 6 Throat letters (ء, ه, ع, ح, غ, خ), pronounce the 'N' cleanly.",
    commonMistake: "Adding an accidental Ghunnah/hum to the Noon.",
    examples: [
      { arabic: "مَنْ ءَامَنَ", transliteration: "Man · aa · ma · na", note: "Crisp clear Noon" },
      { arabic: "عَنْهُمْ", transliteration: "'An · hum", note: "Clear 'N' before Haa" },
    ],
    color: "teal",
    isQuickPick: false,
  },
  {
    id: "idgham",
    slug: "idgham",
    title: "Idgham (Merging into ي ر م ل و ن)",
    shortTitle: "Idgham (Merge)",
    nameUrdu: "ادغام",
    nameArabic: "إِدْغَام",
    category: "noon_meem",
    arabicSymbol: "ي ر م ل و ن",
    rhythmBadge: "🔄 Join Into Next Letter",
    doSay: "May-yaqool (Blend!)",
    dontSay: "Man-yaqool (Separate)",
    shortCue: "Merge the Noon completely into the next letter!",
    explanation:
      "When Noon Saakin or Tanween meets Yarmaloon (ي ر م ل و ن), merge the Noon into that letter.",
    commonMistake: "Pronouncing the Noon distinctly instead of blending seamlessly.",
    examples: [
      { arabic: "مَن يَّقُولُ", transliteration: "May · ya · qool", note: "Noon blends into Yaa" },
      { arabic: "مِّن رَّبِّهِمْ", transliteration: "Mir · rab · bi · him", note: "Noon merges into Raa" },
    ],
    color: "caramel",
    isQuickPick: false,
  },
  {
    id: "iqlab",
    slug: "iqlab",
    title: "Iqlab (Turning Noon into Meem Before Baa)",
    shortTitle: "Iqlab (N → M)",
    nameUrdu: "اقلاب",
    nameArabic: "إِقْلَاب",
    category: "noon_meem",
    arabicSymbol: "نۢ ب",
    rhythmBadge: "👄 Turn 'N' into 'M'!",
    doSay: "Mim-ba'di ('M' sound)",
    dontSay: "Min-ba'di ('N' sound)",
    shortCue: "Turn the 'N' into a gentle 'M' before the letter Baa!",
    explanation:
      "When Noon Saakin or Tanween is followed by the letter Baa (ب), change the sound to a gentle Meem with Ghunnah.",
    commonMistake: "Pronouncing the Noon as 'N' or clamping the lips too hard on the Meem.",
    examples: [
      { arabic: "مِنۢ بَعْدِ", transliteration: "Mim · ba' · di", note: "Tiny Meem mark above Noon" },
      { arabic: "سَمِيعٌۢ بَصِيرٌ", transliteration: "Samee'um · baseer", note: "Tanween turns into Meem" },
    ],
    color: "coral",
    isQuickPick: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 5: Heavy vs Light Letters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "heavy-letters",
    slug: "heavy-letters",
    title: "Heavy Letters (حروفِ مستعلیہ: خ ص ض ط ظ غ ق)",
    shortTitle: "Heavy Letters",
    nameUrdu: "پُر حروف",
    nameArabic: "حُرُوفُ الِاسْتِعْلَاءِ",
    category: "heavy_light",
    arabicSymbol: "خ ص ض ط ظ غ ق",
    rhythmBadge: "🎈 Full Mouth · Heavy!",
    doSay: "Kha · Qaf (Deep & full)",
    dontSay: "Ka · Sa (Flat & thin)",
    shortCue: "Full mouth, deep and heavy! Back of tongue raised.",
    explanation:
      "These 7 letters are ALWAYS pronounced thick, heavy, and resonant with a full mouth.",
    commonMistake: "Reading them light and flat like English letters (e.g. flat 'K' instead of deep 'Qaf').",
    examples: [
      { arabic: "خَلَقَ", transliteration: "Kha · la · qa", note: "Kha and Qaf are heavy; Laam is light" },
      { arabic: "صِرَاطَ", transliteration: "Si · raa · ta", note: "Saad, Raa, and Taa are all heavy" },
    ],
    color: "rose",
    isQuickPick: false,
  },
  {
    id: "raa-rules",
    slug: "raa-rules",
    title: "Raa (ر) Rules: Heavy vs Light",
    shortTitle: "Raa (ر) Rule",
    nameUrdu: "را کے قواعد",
    nameArabic: "أَحْكَامُ الرَّاءِ",
    category: "heavy_light",
    arabicSymbol: "رَ رُ · رِ",
    rhythmBadge: "⚖️ رَ رُ Heavy · رِ Light",
    doSay: "رَ Heavy / رِ Smile",
    dontSay: "Mixing heavy & light",
    shortCue: "Heavy with Zabar/Pesh (رَ / رُ). Light with Zer (رِ)!",
    explanation:
      "Raa is pronounced heavy (Tafkheem) when it has Zabar or Pesh. It is light (Tarqeeq) when it has Zer.",
    commonMistake: "Reading Raa with Zer as heavy, or Raa with Zabar as light.",
    examples: [
      { arabic: "رَبَّنَا", transliteration: "Rab · ba · naa (Heavy)", note: "Heavy Raa (has Zabar)" },
      { arabic: "رِزْقًا", transliteration: "Riz · qan (Light)", note: "Light, smiling Raa (has Zer)" },
    ],
    color: "teal",
    isQuickPick: false,
  },
  {
    id: "laam-allah",
    slug: "laam-allah",
    title: "Laam of Allah (لامِ جلالہ)",
    shortTitle: "Laam of Allah",
    nameUrdu: "لفظ اللہ کا لام",
    nameArabic: "لَامُ لَفْظِ الْجَلَالَةِ",
    category: "heavy_light",
    arabicSymbol: "ٱللَّه",
    rhythmBadge: "⚖️ Allaah vs Lillaah",
    doSay: "Huwal-Laah / Bismil-laah",
    dontSay: "Heavy after Zer",
    shortCue: "Heavy after Zabar/Pesh ('Allah'). Light after Zer ('Lillah')!",
    explanation:
      "The word 'Allah' has a heavy Laam if the letter before it has Zabar or Pesh. If preceded by Zer, it is light.",
    commonMistake: "Saying heavy 'Bismil-Laah' instead of light 'Bismil-laah'.",
    examples: [
      { arabic: "هُوَ ٱللَّهُ", transliteration: "Huwal · Laah (Heavy)", note: "Heavy Laam after Zabar" },
      { arabic: "بِسْمِ ٱللَّهِ", transliteration: "Bismil · laah (Light)", note: "Light, flat Laam after Zer" },
    ],
    color: "sky",
    isQuickPick: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 6: Confused Letters / Makharij
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "thaa-seen-saad",
    slug: "thaa-seen-saad",
    title: "ث (Thaa) vs س (Seen) vs ص (Saad)",
    shortTitle: "ث vs س vs ص",
    nameUrdu: "ث، س، ص میں فرق",
    nameArabic: "مَخَارِج: ث · س · ص",
    category: "makharij",
    arabicSymbol: "ث · س · ص",
    rhythmBadge: "👅 ث Soft · س Whistle · ص Heavy",
    doSay: "ث Tip out / ص Full mouth",
    dontSay: "All 3 like plain 'S'",
    shortCue: "ث = tongue between teeth; س = light whistle; ص = heavy whistle!",
    explanation:
      "Don't mix these up! ث is soft with the tip of the tongue out. س is sharp and whistling. ص is heavy with raised tongue.",
    commonMistake: "Pronouncing all three like an Urdu/English 'S'.",
    examples: [
      { arabic: "ثُمَّ", transliteration: "Thum · ma (Soft)", note: "Tongue tip out slightly" },
      { arabic: "صِرَاطَ", transliteration: "Si · raat (Heavy)", note: "Deep heavy whistle" },
    ],
    color: "coral",
    isQuickPick: false,
  },
  {
    id: "haa-vs-haa",
    slug: "haa-vs-haa",
    title: "ح (Throat Haa) vs ه (Chest Haa)",
    shortTitle: "ح vs ه",
    nameUrdu: "ح اور ہ میں فرق",
    nameArabic: "مَخَارِج: ح · ه",
    category: "makharij",
    arabicSymbol: "ح · ه",
    rhythmBadge: "🗣️ ح Throat · ه Chest",
    doSay: "ح Sharp throat squeeze",
    dontSay: "ه Soft chest breath for ح",
    shortCue: "ح = clean squeeze from middle throat! ه = deep breath from chest.",
    explanation:
      "ح is crisp and comes from the center of the throat (like blowing on glasses). ه comes from deep in the chest.",
    commonMistake: "Saying soft chest 'Haa' (ہ) for 'Al-Hamd' instead of clean throat 'Haa' (ح).",
    examples: [
      { arabic: "ٱلْحَمْدُ", transliteration: "Al · Hamd (Throat ح)", note: "Center of throat (ح)" },
      { arabic: "هُوَ", transliteration: "Hu · wa (Chest ه)", note: "Deep bottom of throat (ه)" },
    ],
    color: "rose",
    isQuickPick: false,
  },
  {
    id: "ayn-vs-alif",
    slug: "ayn-vs-alif",
    title: "ع (Ayn) vs ء / ا (Hamza / Alif)",
    shortTitle: "ع vs ء",
    nameUrdu: "ع اور ء میں فرق",
    nameArabic: "مَخَارِج: ع · ء",
    category: "makharij",
    arabicSymbol: "ع · ء",
    rhythmBadge: "🗣️ ع Deep Throat · ء Light",
    doSay: "'A-leem (Squeeze throat)",
    dontSay: "A-leem (Plain Alif)",
    shortCue: "ع = squeeze the middle of throat! ء = sharp stop.",
    explanation:
      "Ayn (ع) requires squeezing the vocal cords gently in the middle throat. Hamza (ء) is a quick sharp glottal stop.",
    commonMistake: "Reading Ayn like a plain Alif (e.g. saying 'Alameen' without the deep throat squeeze).",
    examples: [
      { arabic: "عَلِيمٌ", transliteration: "'A · leem (Throat ع)", note: "Squeezed middle throat (ع)" },
      { arabic: "أَلِيمٌ", transliteration: "A · leem (Plain ء)", note: "Sharp clear stop (ء)" },
    ],
    color: "caramel",
    isQuickPick: false,
  },
  {
    id: "qaf-vs-kaf",
    slug: "qaf-vs-kaf",
    title: "ق (Deep Qaf) vs ك (Front Kaf)",
    shortTitle: "ق vs ك",
    nameUrdu: "ق اور ک میں فرق",
    nameArabic: "مَخَارِج: ق · ك",
    category: "makharij",
    arabicSymbol: "ق · ك",
    rhythmBadge: "🎈 ق Deep Heavy · ك Light",
    doSay: "Qul (Deep back tongue)",
    dontSay: "Kul (Flat English K)",
    shortCue: "ق = deep back of tongue (uvula)! ك = front palate with breath.",
    explanation:
      "Qaf (ق) is produced from the very back of the tongue hitting the soft palate (heavy). Kaf (ك) is light with a puff of air.",
    commonMistake: "Reading Qaf as a light 'K' (e.g. saying 'Kul' instead of 'Qul').",
    examples: [
      { arabic: "قُلْ", transliteration: "Qul (Deep ق)", note: "Deep heavy Qaf" },
      { arabic: "كُلْ", transliteration: "Kul (Light ك)", note: "Light friendly Kaf with slight air" },
    ],
    color: "teal",
    isQuickPick: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Category 7: Waqf & Stopping Signs
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "waqf-signs",
    slug: "waqf-signs",
    title: "Waqf Signs (م، ط، ج، ز، ص، لا)",
    shortTitle: "Waqf / Stop",
    nameUrdu: "رموزِ اوقاف",
    nameArabic: "عَلَامَاتُ الْوَقْفِ",
    category: "waqf",
    arabicSymbol: "مـ  ط  لا",
    rhythmBadge: "🛑 Rest Last Letter on Stop",
    doSay: "Ar-Raheem (Rest at stop)",
    dontSay: "Ar-Raheemi (Don't vowel)",
    shortCue: "م = must stop; ط = better to stop; ج = either way; لا = do not stop!",
    explanation:
      "Waqf symbols tell you where to breathe and stop. When stopping on a word, turn the last vowel into a Sukoon.",
    commonMistake: "Pronouncing the last vowel when stopping, or stopping on 'لا' in the middle of an ayah.",
    examples: [
      { arabic: "ٱلرَّحِيمْ", transliteration: "Ar · Ra · heem (Stop)", note: "Drop Zer and rest" },
      { arabic: "مـ  /  لا", transliteration: "مـ Stop · لا Don't stop", note: "Follow the sign" },
    ],
    color: "sage",
    isQuickPick: false,
  },
]

/** Filter rules by category */
export function getRulesByCategory(category: TajweedCategory): TajweedRule[] {
  return TAJWEED_RULES.filter((r) => r.category === category)
}

/** Get quick pick rules for the live toolbar */
export function getQuickPickRules(): TajweedRule[] {
  return TAJWEED_RULES.filter((r) => r.isQuickPick)
}

/** Search rules by keyword (English, Urdu, Arabic, slug) */
export function searchRules(query: string): TajweedRule[] {
  const q = query.trim().toLowerCase()
  if (!q) return TAJWEED_RULES

  return TAJWEED_RULES.filter((r) => {
    return (
      r.title.toLowerCase().includes(q) ||
      r.shortTitle.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.nameUrdu.toLowerCase().includes(q) ||
      r.nameArabic.toLowerCase().includes(q) ||
      r.shortCue.toLowerCase().includes(q) ||
      r.explanation.toLowerCase().includes(q) ||
      r.arabicSymbol.toLowerCase().includes(q)
    )
  })
}
