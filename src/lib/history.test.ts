import { describe, expect, it } from "vitest"

import {
  CATEGORIES,
  CURATED_ISLAMIC_TOPICS,
  normalizeTopicSlug,
  parseStoryScenes,
} from "./history"

describe("Islamic History Module - Helper Logic", () => {
  describe("normalizeTopicSlug", () => {
    it("normalizes prophet honorifics and punctuation correctly", () => {
      expect(normalizeTopicSlug("Hazrat Adam (A.S.)")).toBe("adam")
      expect(normalizeTopicSlug("Prophet Nuh (AS)")).toBe("nuh")
      expect(normalizeTopicSlug("The Story of Prophet Ibrahim (PBUH)")).toBe("ibrahim")
      expect(normalizeTopicSlug("Sayyidina Musa (as)")).toBe("musa")
      expect(normalizeTopicSlug("Prophet Muhammad ﷺ")).toBe("muhammad")
    })

    it("handles event names and companions cleanly", () => {
      expect(normalizeTopicSlug("Al-Isra' wal-Mi'raj")).toBe("al_isra_wal_miraj")
      expect(normalizeTopicSlug("The Battle of Badr")).toBe("battle_of_badr")
      expect(normalizeTopicSlug("Abu Bakr As-Siddiq (RA)")).toBe("abu_bakr_siddiq")
      expect(normalizeTopicSlug("Bilal ibn Rabah (RA)")).toBe("bilal_ibn_rabah")
    })

    it("handles empty or special character input without crashing", () => {
      expect(normalizeTopicSlug("   ")).toBe("custom_story")
      expect(normalizeTopicSlug("???!!!")).toBe("custom_story")
    })
  })

  describe("CURATED_ISLAMIC_TOPICS", () => {
    it("contains at least 10 classical curated topics", () => {
      expect(CURATED_ISLAMIC_TOPICS.length).toBeGreaterThanOrEqual(10)
    })

    it("ensures each curated topic has a unique slug and authentic category", () => {
      const slugs = new Set<string>()
      const allowedCategories = new Set(CATEGORIES)

      for (const topic of CURATED_ISLAMIC_TOPICS) {
        expect(slugs.has(topic.topic_slug)).toBe(false)
        slugs.add(topic.topic_slug)

        expect(allowedCategories.has(topic.category as (typeof CATEGORIES)[number])).toBe(true)
        expect(topic.defaultVirtue.length).toBeGreaterThan(0)
        expect(topic.title.length).toBeGreaterThan(0)
      }
    })
  })

  describe("parseStoryScenes", () => {
    it("parses explicit Scene 1, 2, 3 plain text formats into episodic cards", () => {
      const storyText = `Scene 1: A Breath of Life and a Jealous Shadow
Before the oceans roared or the mountains stood tall, Allah gathered clay.

Scene 2: The Whispering Tree
Allah welcomed Adam and his beautiful wife into Paradise.

Scene 3: The Power of 'I am Sorry'
Allah called out to them with justice and mercy.`

      const scenes = parseStoryScenes(storyText)
      expect(scenes).toHaveLength(3)
      expect(scenes[0].sceneNumber).toBe(1)
      expect(scenes[0].title).toBe("A Breath of Life and a Jealous Shadow")
      expect(scenes[0].paragraphs[0]).toContain("Before the oceans roared")

      expect(scenes[1].sceneNumber).toBe(2)
      expect(scenes[1].title).toBe("The Whispering Tree")

      expect(scenes[2].sceneNumber).toBe(3)
      expect(scenes[2].title).toBe("The Power of 'I am Sorry'")
    })

    it("parses markdown header formats (### Scene 1: Title)", () => {
      const mdText = `### Scene 1: The Mountain Peak
Prophet Musa climbed high.

### Scene 2: The Burning Bush
A wondrous light sparkled with warmth.

### Scene 3: The Divine Mission
Speak gently to Pharaoh.`

      const scenes = parseStoryScenes(mdText)
      expect(scenes).toHaveLength(3)
      expect(scenes[0].title).toBe("The Mountain Peak")
      expect(scenes[1].title).toBe("The Burning Bush")
      expect(scenes[2].title).toBe("The Divine Mission")
    })

    it("falls back gracefully for stories without scene headers", () => {
      const rawText = "Paragraph 1 story.\n\nParagraph 2 story.\n\nParagraph 3 story."
      const scenes = parseStoryScenes(rawText)
      expect(scenes.length).toBeGreaterThanOrEqual(1)
      expect(scenes[0].title).toContain("Scene 1")
    })

    it("returns an empty array for empty or null content", () => {
      expect(parseStoryScenes("")).toEqual([])
      expect(parseStoryScenes(null)).toEqual([])
      expect(parseStoryScenes(undefined)).toEqual([])
    })
  })
})

