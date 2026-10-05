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
 * Strictly removes all em dashes (—, \u2014, &mdash;) and en dashes (–, \u2013, &ndash;)
 * from story text and replaces them with natural, kid-friendly punctuation (commas, colons, or clean pauses).
 */
export function removeEmDashes(text: string | null | undefined): string {
  if (!text) return ""

  let s = text

  // 1. Replace HTML entities for em/en dashes
  s = s.replace(/&(?:mdash|ndash|#8211|#8212|#x2013|#x2014);/gi, ", ")

  // 2. Trailing em/en dashes at end of lines or end of text
  s = s.replace(/\s*[—–―]+\s*(\n|$)/g, "$1")

  // 3. Normalize unicode em dashes attached to preceding punctuation like ": —" or ", —"
  s = s.replace(/([,;:!?.])\s*[—–―]+\s*/g, "$1 ")

  // 4. At line starts or after newlines, strip the dash
  s = s.replace(/(^|\n)\s*[—–―]+\s*/g, "$1")

  // 5. In the middle of text (e.g. "Earth—red" or "word — word") -> replace with comma + space
  s = s.replace(/\s*[—–―]+\s*/g, ", ")

  // 6. Replace double hyphens " -- " used as em dashes
  // Protect markdown dividers (--- on its own line) by requiring non-dash text before and after
  s = s.replace(/([^\n\-\s])\s*--\s*([^\n\-\s])/g, "$1, $2")

  // 7. Clean up any accidental punctuation collisions created
  s = s.replace(/,\s*,+/g, ",")
  s = s.replace(/,\s*\./g, ".")
  s = s.replace(/,\s*!/g, "!")
  s = s.replace(/,\s*\?/g, "?")
  s = s.replace(/:\s*,/g, ":")
  s = s.replace(/\(\s*,/g, "(")
  s = s.replace(/,\s*\)/g, ")")

  // 8. Clean trailing space before punctuation or at end of lines
  s = s.replace(/[ \t]+([,;:!?.])/g, "$1")
  s = s.replace(/[ \t]+(\n|$)/g, "$1")

  // 9. Collapse duplicate spaces (preserve intentional newlines)
  s = s.replace(/[ \t]{2,}/g, " ")

  return s
}

/**
 * Extracts a concise, impactful title for cover image generation.
 * Strips Islamic honorifics (AS, RA, PBUH, etc.) and trims excessively long secondary subtitles
 * to produce optimal, crisp 3D text typography for AI image generators (Canva Dream Lab, Ideogram, Flux).
 */
export function getCoverTitleText(rawTitle: string): string {
  if (!rawTitle) return ""
  let clean = rawTitle
    .replace(/\s*\((?:AS|A\.S\.|as|PBUH|pbuh|RA|R\.A\.|ra)\)/gi, "")
    .replace(/ﷺ|\uFDFA/g, "")
    .replace(/\s+/g, " ")
    .trim()

  // If the title is very long with multiple colons/ampersands, take the main title + primary hook
  // E.g. "Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience" -> "Prophet Nuh: The Giant Ark of Hope"
  if (clean.length > 45 && clean.includes(" & ")) {
    const parts = clean.split(" & ")
    if (parts[0].length >= 12) {
      clean = parts[0].trim()
    }
  }

  return clean
}

/**
 * Ensures that any Canva AI / Dream Lab cover prompt explicitly embeds the related story title
 * in 3D typography into the picture.
 */
export function formatCoverPromptWithText(prompt: string, title: string): string {
  if (!prompt || !prompt.trim()) return prompt
  const displayTitle = getCoverTitleText(title)
  if (!displayTitle) return prompt

  const lower = prompt.toLowerCase()
  // Check if text typography instruction is already present
  if (
    lower.includes("title text") ||
    lower.includes("embedded text") ||
    lower.includes("title typography") ||
    lower.includes(`"${displayTitle.toLowerCase()}"`)
  ) {
    return prompt
  }

  const textPhrase = `featuring the storybook title text "${displayTitle}" in bold glowing 3D embossed golden storybook typography at the top`

  // Insert before style descriptors if present
  const styleTriggers = [
    ", disney pixar",
    ", pixar",
    ", 3d pixar",
    ", digital children's",
    ", cinematic",
  ]
  for (const trigger of styleTriggers) {
    const idx = lower.indexOf(trigger)
    if (idx !== -1) {
      return (
        prompt.slice(0, idx) +
        `, ${textPhrase}` +
        prompt.slice(idx)
      )
    }
  }

  // Fallback: append cleanly
  const trimmed = prompt.trim().replace(/\.+$/, "")
  return `${trimmed}, ${textPhrase}.`
}

/**
 * Builds an authentic, high-converting Canva AI / Dream Lab / Midjourney prompt
 * tailored for children's Islamic history storybook covers.
 *
 * Strict Islamic art rule: Never generates faces or physical depictions of Prophets.
 * Focuses on majestic atmospheric nature, celestial skies, lush paradises, and symbolic wonder.
 *
 * Mandatory: Embeds the related story title text directly into the picture in 3D typography.
 */
export function getCanvaDreamLabPrompt(story: {
  title: string
  category?: string
  hero_virtue?: string | null
  summary?: string | null
  cover_prompt?: string | null
}): string {
  if (story.cover_prompt && story.cover_prompt.trim().length > 20) {
    return formatCoverPromptWithText(story.cover_prompt.trim(), story.title)
  }

  const clean = story.title.toLowerCase()
  const displayTitle = getCoverTitleText(story.title)
  const typographyDirective = `featuring the storybook title text "${displayTitle}" in bold glowing 3D embossed golden storybook typography at the top`

  if (clean.includes("adam")) {
    return `Lush, magical ancient gardens of Paradise with radiant golden sunlight streaming through giant weeping emerald willow trees, crystal-clear flowing streams of water, vibrant exotic flowers and gentle glowing butterflies, ${typographyDirective}, peaceful celestial atmosphere, Pixar 3D animated movie style, digital children's storybook illustration, rich volumetric lighting, cinematic wide landscape composition, 8k, warm and enchanting. No human faces or figures, scenic nature only.`
  }

  if (clean.includes("nuh") || clean.includes("ark")) {
    return `A colossal, majestic handcrafted wooden ark resting on the peak of a misty mountaintop as dark storm clouds part into a glorious golden sunrise and vibrant rainbow over the calm receding blue ocean, ${typographyDirective}, Disney Pixar 3D storybook concept art, warm heroic atmospheric lighting, cinematic 16:9, highly detailed wood texture, uplifting and hopeful. No human faces, epic scenery only.`
  }

  if (clean.includes("ibrahim") || clean.includes("fire") || clean.includes("star")) {
    return `A tranquil desert night under an endless canopy of millions of glowing, swirling celestial stars and crescent moon, ancient rocky hills illuminated by soft starlight and gentle desert breeze, ${typographyDirective}, Pixar 3D animated style, whimsical children's book illustration, deep sapphire blue and golden glow, awe-inspiring, 8k. Scenic atmosphere without human figures.`
  }

  if (clean.includes("musa") || clean.includes("sea") || clean.includes("nile")) {
    return `A wondrous parted sea revealing a luminous pathway of dry ground with towering walls of crystal sapphire ocean water held back like transparent glass walls, colorful gentle sea creatures visible within the waves, golden divine light beaming through the horizon, ${typographyDirective}, Pixar 3D storybook cinematic style, breathtaking 16:9, vibrant colors. No human faces.`
  }

  if (clean.includes("yusuf") || clean.includes("egypt") || clean.includes("well")) {
    return `Majestic ancient Egyptian palace courtyard bathed in warm golden afternoon sun, lush date palms, ornate geometric arches, sparkling marble fountains, and serene desert dunes in the backdrop, ${typographyDirective}, Disney Pixar 3D animated background art, vibrant warm pastel palette, highly detailed, children's book cover. Scenic architecture only, no human faces.`
  }

  if (clean.includes("sulayman") || clean.includes("ant")) {
    return `A wondrous kingdom valley with rolling emerald hills, ancient olive groves, sparkling marble palace domes on the distant horizon, and a charming whimsical close-up of friendly little ants on a mossy stone under warm dappled golden sunlight, ${typographyDirective}, 3D Pixar animation style, cozy storybook illustration, rich lighting. No human faces.`
  }

  if (clean.includes("yunus") || clean.includes("whale")) {
    return `Deep mysterious yet peaceful ocean underwater scene with glowing turquoise bioluminescent light, shimmering water surface above with golden moonbeams, gentle bubbles, and the magnificent silhouette of a gentle giant whale swimming peacefully in crystal clear deep water, ${typographyDirective}, Pixar 3D animated movie still, magical children's storybook art, 8k. No human faces.`
  }

  if (clean.includes("muhammad") || clean.includes("makkah") || clean.includes("hijrah") || clean.includes("isra")) {
    return `Historic ancient Makkah and desert hills under a magical twilight sky filled with glowing stars and glowing crescent moon, soft warm lantern lights glowing from peaceful clay houses, gentle desert wind, ${typographyDirective}, Pixar 3D animated storybook art, respectful and serene Islamic atmosphere, cinematic wide landscape, 8k. Strictly scenic, no facial depictions or human figures.`
  }

  const virtueText = story.hero_virtue ? ` reflecting the virtue of ${story.hero_virtue}` : ""
  return `Enchanting Islamic children's storybook cover illustration for "${displayTitle}"${virtueText}, ${typographyDirective}, peaceful ancient desert oasis with glowing golden lanterns, lush date palm trees, majestic mountain silhouette under a star-filled celestial twilight sky with a radiant crescent moon, Disney Pixar 3D animated style, rich volumetric lighting, vibrant heartwarming colors, 8k, 16:9 landscape aspect ratio. Scenic and atmospheric only, no human faces.`
}

export interface StoryScene {
  id: string
  sceneNumber: number
  title: string
  rawText: string
  paragraphs: string[]
}

/**
 * Parses markdown or plain text story content into discrete episodic scenes.
 *
 * Handles:
 * 1. Markdown headers: `### Scene 1: ...` or `## Scene 1 - ...`
 * 2. Plain text scene markers: `Scene 1: Title\n...`
 * 3. Fallback: If no explicit scene markers are present, splits into balanced
 *    scenes by paragraphs so any legacy story displays as an interactive card reel!
 *
 * Strict: Automatically strips any em dashes from scene titles and paragraphs!
 */
export function parseStoryScenes(content: string | null | undefined): StoryScene[] {
  if (!content || !content.trim()) return []

  const text = removeEmDashes(content).trim()

  const sceneHeaderRegex =
    /(?:^|\n)(?:#{1,3}\s*)?(?:Scene|Part|Episode|Chapter)\s*(\d+)[:\s\-]+([^\n]+)/gi

  const matches: { index: number; sceneNumber: number; title: string; matchLength: number }[] = []
  let match: RegExpExecArray | null

  while ((match = sceneHeaderRegex.exec(text)) !== null) {
    const rawNumber = parseInt(match[1], 10)
    const title = removeEmDashes(match[2].trim().replace(/^[:\-\s]+/, ""))
    matches.push({
      index: match.index,
      sceneNumber: isNaN(rawNumber) ? matches.length + 1 : rawNumber,
      title,
      matchLength: match[0].length,
    })
  }

  // If at least 2 scene headers were identified, slice along those boundaries
  if (matches.length >= 2) {
    const scenes: StoryScene[] = []
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]
      const startIndex = current.index + current.matchLength
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length
      const body = text.slice(startIndex, endIndex).trim()
      const paragraphs = body
        .split(/\n\s*\n/)
        .map((p) => removeEmDashes(p.trim()))
        .filter((p) => p.length > 0)

      scenes.push({
        id: `scene-${current.sceneNumber}`,
        sceneNumber: current.sceneNumber,
        title: current.title || `Scene ${current.sceneNumber}`,
        rawText: body,
        paragraphs,
      })
    }
    return scenes
  }

  // Fallback: split long text into 2 or 3 episodic scenes by paragraphs
  const allParagraphs = text
    .split(/\n\s*\n/)
    .map((p) => removeEmDashes(p.trim()))
    .filter((p) => p.length > 0)

  if (allParagraphs.length <= 1) {
    return [
      {
        id: "scene-1",
        sceneNumber: 1,
        title: "The Adventure",
        rawText: text,
        paragraphs: allParagraphs,
      },
    ]
  }

  if (allParagraphs.length === 2) {
    return [
      {
        id: "scene-1",
        sceneNumber: 1,
        title: "Part 1: The Beginning",
        rawText: allParagraphs[0],
        paragraphs: [allParagraphs[0]],
      },
      {
        id: "scene-2",
        sceneNumber: 2,
        title: "Part 2: The Lesson",
        rawText: allParagraphs[1],
        paragraphs: [allParagraphs[1]],
      },
    ]
  }

  // 3 or more paragraphs: distribute evenly across 3 scenes
  const chunkSize = Math.ceil(allParagraphs.length / 3)
  const p1 = allParagraphs.slice(0, chunkSize)
  const p2 = allParagraphs.slice(chunkSize, chunkSize * 2)
  const p3 = allParagraphs.slice(chunkSize * 2)

  return [
    {
      id: "scene-1",
      sceneNumber: 1,
      title: "Scene 1: The Beginning",
      rawText: p1.join("\n\n"),
      paragraphs: p1,
    },
    {
      id: "scene-2",
      sceneNumber: 2,
      title: "Scene 2: The Adventure",
      rawText: p2.join("\n\n"),
      paragraphs: p2,
    },
    {
      id: "scene-3",
      sceneNumber: 3,
      title: "Scene 3: The Golden Wisdom",
      rawText: p3.join("\n\n"),
      paragraphs: p3,
    },
  ]
}

