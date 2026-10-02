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
  cover_prompt?: string | null
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

/**
 * Builds an authentic, high-converting Canva AI / Dream Lab / Midjourney prompt
 * tailored for children's Islamic history storybook covers.
 *
 * Strict Islamic art rule: Never generates faces or physical depictions of Prophets.
 * Focuses on majestic atmospheric nature, celestial skies, lush paradises, and symbolic wonder.
 */
export function getCanvaDreamLabPrompt(story: {
  title: string
  category?: string
  hero_virtue?: string | null
  summary?: string | null
  cover_prompt?: string | null
}): string {
  if (story.cover_prompt && story.cover_prompt.trim().length > 20) {
    return story.cover_prompt.trim()
  }

  const clean = story.title.toLowerCase()

  if (clean.includes("adam")) {
    return "Lush, magical ancient gardens of Paradise with radiant golden sunlight streaming through giant weeping emerald willow trees, crystal-clear flowing streams of water, vibrant exotic flowers and gentle glowing butterflies, peaceful celestial atmosphere, Pixar 3D animated movie style, digital children's storybook illustration, rich volumetric lighting, cinematic wide landscape composition, 8k, warm and enchanting. No human faces or figures, scenic nature only."
  }

  if (clean.includes("nuh") || clean.includes("ark")) {
    return "A colossal, majestic handcrafted wooden ark resting on the peak of a misty mountaintop as dark storm clouds part into a glorious golden sunrise and vibrant rainbow over the calm receding blue ocean, Disney Pixar 3D storybook concept art, warm heroic atmospheric lighting, cinematic 16:9, highly detailed wood texture, uplifting and hopeful. No human faces, epic scenery only."
  }

  if (clean.includes("ibrahim") || clean.includes("fire") || clean.includes("star")) {
    return "A tranquil desert night under an endless canopy of millions of glowing, swirling celestial stars and crescent moon, ancient rocky hills illuminated by soft starlight and gentle desert breeze, Pixar 3D animated style, whimsical children's book illustration, deep sapphire blue and golden glow, awe-inspiring, 8k. Scenic atmosphere without human figures."
  }

  if (clean.includes("musa") || clean.includes("sea") || clean.includes("nile")) {
    return "A wondrous parted sea revealing a luminous pathway of dry ground with towering walls of crystal sapphire ocean water held back like transparent glass walls, colorful gentle sea creatures visible within the waves, golden divine light beaming through the horizon, Pixar 3D storybook cinematic style, breathtaking 16:9, vibrant colors. No human faces."
  }

  if (clean.includes("yusuf") || clean.includes("egypt") || clean.includes("well")) {
    return "Majestic ancient Egyptian palace courtyard bathed in warm golden afternoon sun, lush date palms, ornate geometric arches, sparkling marble fountains, and serene desert dunes in the backdrop, Disney Pixar 3D animated background art, vibrant warm pastel palette, highly detailed, children's book cover. Scenic architecture only, no human faces."
  }

  if (clean.includes("sulayman") || clean.includes("ant")) {
    return "A wondrous kingdom valley with rolling emerald hills, ancient olive groves, sparkling marble palace domes on the distant horizon, and a charming whimsical close-up of friendly little ants on a mossy stone under warm dappled golden sunlight, 3D Pixar animation style, cozy storybook illustration, rich lighting. No human faces."
  }

  if (clean.includes("yunus") || clean.includes("whale")) {
    return "Deep mysterious yet peaceful ocean underwater scene with glowing turquoise bioluminescent light, shimmering water surface above with golden moonbeams, gentle bubbles, and the magnificent silhouette of a gentle giant whale swimming peacefully in crystal clear deep water, Pixar 3D animated movie still, magical children's storybook art, 8k. No human faces."
  }

  if (clean.includes("muhammad") || clean.includes("makkah") || clean.includes("hijrah") || clean.includes("isra")) {
    return "Historic ancient Makkah and desert hills under a magical twilight sky filled with glowing stars and glowing crescent moon, soft warm lantern lights glowing from peaceful clay houses, gentle desert wind, Pixar 3D animated storybook art, respectful and serene Islamic atmosphere, cinematic wide landscape, 8k. Strictly scenic, no facial depictions or human figures."
  }

  const virtueText = story.hero_virtue ? ` reflecting the virtue of ${story.hero_virtue}` : ""
  return `Enchanting Islamic children's storybook cover illustration for "${story.title}"${virtueText}, peaceful ancient desert oasis with glowing golden lanterns, lush date palm trees, majestic mountain silhouette under a star-filled celestial twilight sky with a radiant crescent moon, Disney Pixar 3D animated style, rich volumetric lighting, vibrant heartwarming colors, 8k, 16:9 landscape aspect ratio. Scenic and atmospheric only, no human faces.`
}
