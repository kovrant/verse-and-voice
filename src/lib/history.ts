// Shared shape + labels for the Islamic history module (teacher admin + student reader).

export interface QuranGem {
  surah_number: number
  surah_name: string
  ayah_number: string
  arabic: string
  translation: string
  child_takeaway: string
}

export interface LifeLesson {
  context: string
  emoji: string
  lesson: string
}

/** Full `islamic_history` row. Student pages select a subset — narrow with `Pick`. */
export interface HistoryStory {
  id: string
  title: string
  arabic_title: string | null
  subtitle?: string | null
  topic_slug?: string | null
  summary: string | null
  content: string | null
  category: string
  target_age_group?: "5-8" | "9-12" | "13-16" | "all" | null
  hero_virtue?: string | null
  reading_time_mins?: number | null
  quran_gem?: QuranGem | null
  life_lessons?: LifeLesson[] | null
  reflection_challenge?: string | null
  quiz_id?: string | null
  hijri_month: number | null
  cover_image_url: string | null
  file_url: string | null
  file_type: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StudentStoryProgress {
  id: string
  student_id: string
  story_id: string
  completed_at: string
  reflection_pledged: boolean
  quiz_attempt_id?: string | null
}

export const CATEGORIES = [
  "Prophets",
  "Companions",
  "Battles",
  "Events",
  "Places",
  "Other",
] as const

export const CATEGORY_ICON: Record<string, string> = {
  Prophets: "🕌",
  Companions: "🤝",
  Battles: "⚔️",
  Events: "📅",
  Places: "🕋",
  Other: "📜",
}

/**
 * Normalizes a topic into a consistent topic_slug to prevent accidental duplicates.
 * Examples:
 *   "Prophet Adam" -> "prophet_adam"
 *   "Hazrat Adam (A.S.)" -> "prophet_adam"
 *   "The Story of Prophet Nuh" -> "prophet_nuh"
 *   "Al-Isra wal-Miraj" -> "isra_miraj"
 */
export function normalizeTopicSlug(raw: string): string {
  let s = raw.toLowerCase().trim()
  s = s.replace(/[\(\)\[\]\{\}\.,'"`ﷺ\uFDFA\u0610-\u061A]/g, "")
  s = s.replace(/\b(hazrat|sayyidina|prophet|nabi|story of|the)\b/g, "")
  s = s.replace(/\b(as|pbuh|ra)\b/g, "")
  s = s.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return s || "custom_story"
}

export interface CuratedTopic {
  title: string
  category: string
  topic_slug: string
  hijri_month?: number
  defaultVirtue: string
}

export const CURATED_ISLAMIC_TOPICS: CuratedTopic[] = [
  {
    title: "Prophet Adam (AS): The Beginning & The Power of Sincere Apology",
    category: "Prophets",
    topic_slug: "adam",
    defaultVirtue: "Repentance (Istighfar)",
  },
  {
    title: "Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience",
    category: "Prophets",
    topic_slug: "nuh",
    defaultVirtue: "Patience (Sabr)",
  },
  {
    title: "Prophet Ibrahim (AS): The Cool Fire & Finding the Creator of the Stars",
    category: "Prophets",
    topic_slug: "ibrahim",
    defaultVirtue: "Courage & Truth (Sidq)",
  },
  {
    title: "Prophet Yusuf (AS): From the Dark Well to the Palace of Egypt",
    category: "Prophets",
    topic_slug: "yusuf",
    defaultVirtue: "Forgiveness (Afw)",
  },
  {
    title: "Prophet Musa (AS): The Basket in the Nile & The Parting of the Sea",
    category: "Prophets",
    topic_slug: "musa",
    hijri_month: 1, // Muharram / Ashura
    defaultVirtue: "Trust in Allah (Tawakkul)",
  },
  {
    title: "Prophet Sulayman (AS): The King Who Listened to the Little Ant",
    category: "Prophets",
    topic_slug: "sulayman",
    defaultVirtue: "Humility & Gratitude (Shukr)",
  },
  {
    title: "Prophet Yunus (AS): In the Belly of the Whale & The Prayer of Light",
    category: "Prophets",
    topic_slug: "yunus",
    defaultVirtue: "Hope & Remembrance (Dhikr)",
  },
  {
    title: "Prophet Isa (AS): The Miracles of Mercy & Kindness to the Sick",
    category: "Prophets",
    topic_slug: "isa",
    defaultVirtue: "Compassion (Rahmah)",
  },
  {
    title: "Prophet Muhammad ﷺ: The Honest & Trustworthy Boy in Makkah (Al-Amin)",
    category: "Prophets",
    topic_slug: "muhammad_early",
    hijri_month: 3, // Rabi al-Awwal
    defaultVirtue: "Integrity (Amanah)",
  },
  {
    title: "Al-Isra' wal-Mi'raj: The Miraculous Night Journey Beyond the Heavens",
    category: "Events",
    topic_slug: "isra_miraj",
    hijri_month: 7, // Rajab
    defaultVirtue: "Wonder & Prayer (Salah)",
  },
  {
    title: "The Great Hijrah: The Spiderweb at the Cave & New Beginnings in Madinah",
    category: "Events",
    topic_slug: "hijrah",
    hijri_month: 1, // Muharram
    defaultVirtue: "Brotherhood & Courage",
  },
  {
    title: "The Battle of Badr: Standing for Truth Against All Odds",
    category: "Battles",
    topic_slug: "badr",
    hijri_month: 9, // Ramadan
    defaultVirtue: "Reliance on Allah",
  },
  {
    title: "The Conquest of Makkah: The Day of Supreme Mercy ('Go, You Are Free')",
    category: "Events",
    topic_slug: "fath_makkah",
    hijri_month: 9, // Ramadan
    defaultVirtue: "Mercy & Peacemaking",
  },
  {
    title: "Abu Bakr As-Siddiq (RA): The True Friend Who Never Hesitated in Good",
    category: "Companions",
    topic_slug: "abu_bakr",
    defaultVirtue: "Loyalty & Generosity",
  },
  {
    title: "Bilal ibn Rabah (RA): The Beautiful Voice of Freedom & Faith (Ahad! Ahad!)",
    category: "Companions",
    topic_slug: "bilal",
    defaultVirtue: "Equality & Resilience",
  },
]
