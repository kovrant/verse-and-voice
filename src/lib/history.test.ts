import { describe, expect, it } from "vitest"

import {
  CATEGORIES,
  CURATED_ISLAMIC_TOPICS,
  formatCoverPromptWithText,
  getCanvaDreamLabPrompt,
  getCoverTitleText,
  normalizeTopicSlug,
  parseStoryScenes,
  removeEmDashes,
} from "./history"

describe("Islamic History Module - Helper Logic", () => {
  describe("removeEmDashes", () => {
    it("removes unicode em dashes and en dashes cleanly", () => {
      expect(removeEmDashes("Earth—red, white, yellow, and black.")).toBe(
        "Earth, red, white, yellow, and black.",
      )
      expect(
        removeEmDashes(
          "teaching him the names of everything in existence—from the majestic stars to the tiniest insects.",
        ),
      ).toBe(
        "teaching him the names of everything in existence, from the majestic stars to the tiniest insects.",
      )
      expect(removeEmDashes("word – word")).toBe("word, word")
      expect(removeEmDashes("word — word")).toBe("word, word")
    })

    it("handles double hyphens used as em dashes while preserving single hyphens and markdown dividers", () => {
      expect(removeEmDashes("word -- word")).toBe("word, word")
      expect(removeEmDashes("kid-friendly storybook")).toBe("kid-friendly storybook")
      expect(removeEmDashes("Part 1\n---\nPart 2")).toBe("Part 1\n---\nPart 2")
    })

    it("prevents punctuation collisions when removing em dashes", () => {
      expect(removeEmDashes("He said: — 'Welcome!'")).toBe("He said: 'Welcome!'")
      expect(removeEmDashes("Wait, — what happened?")).toBe("Wait, what happened?")
      expect(removeEmDashes("A great ending.—")).toBe("A great ending.")
    })

    it("handles empty or null inputs gracefully", () => {
      expect(removeEmDashes("")).toBe("")
      expect(removeEmDashes(null)).toBe("")
      expect(removeEmDashes(undefined)).toBe("")
    })
  })

  describe("getCoverTitleText", () => {
    it("strips Islamic honorifics for clean 3D cover art typography", () => {
      expect(getCoverTitleText("Prophet Nuh (AS)")).toBe("Prophet Nuh")
      expect(getCoverTitleText("Hazrat Adam (A.S.)")).toBe("Hazrat Adam")
      expect(getCoverTitleText("Prophet Muhammad ﷺ")).toBe("Prophet Muhammad")
      expect(getCoverTitleText("Abu Bakr As-Siddiq (RA)")).toBe("Abu Bakr As-Siddiq")
    })

    it("shortens excessively long combined titles with ampersands for punchy cover text", () => {
      expect(
        getCoverTitleText("Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience"),
      ).toBe("Prophet Nuh: The Giant Ark of Hope")
    })
  })

  describe("formatCoverPromptWithText", () => {
    it("embeds title text typography before style descriptors", () => {
      const basePrompt =
        "A colossal, majestic handcrafted wooden ark resting on the peak of a misty mountaintop as dark storm clouds part into a glorious golden sunrise and vibrant rainbow over the calm receding blue ocean, Disney Pixar 3D storybook concept art, warm heroic atmospheric lighting, cinematic 16:9, highly detailed wood texture, uplifting and hopeful. No human faces, epic scenery only."

      const formatted = formatCoverPromptWithText(
        basePrompt,
        "Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience",
      )

      expect(formatted).toContain(
        'featuring the storybook title text "Prophet Nuh: The Giant Ark of Hope" in bold glowing 3D embossed golden storybook typography at the top',
      )
      expect(formatted).toContain("Disney Pixar 3D storybook concept art")
    })

    it("does not duplicate title typography if already present in the prompt", () => {
      const alreadyFormatted =
        'A majestic ark, featuring the storybook title text "Prophet Nuh" in bold glowing 3D embossed golden storybook typography at the top, Disney Pixar style.'
      const result = formatCoverPromptWithText(alreadyFormatted, "Prophet Nuh")
      expect(result).toBe(alreadyFormatted)
    })
  })

  describe("getCanvaDreamLabPrompt", () => {
    it("generates a prompt with embedded 3D title text for Prophet Nuh", () => {
      const prompt = getCanvaDreamLabPrompt({
        title: "Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience",
      })

      expect(prompt).toContain(
        'featuring the storybook title text "Prophet Nuh: The Giant Ark of Hope" in bold glowing 3D embossed golden storybook typography at the top',
      )
      expect(prompt).toContain("A colossal, majestic handcrafted wooden ark")
      expect(prompt).toContain("Disney Pixar 3D storybook concept art")
      expect(prompt).toContain("No human faces")
    })

    it("generates a prompt with embedded 3D title text for Prophet Adam", () => {
      const prompt = getCanvaDreamLabPrompt({
        title: "Prophet Adam (AS): The Beginning & The Power of Sincere Apology",
      })

      expect(prompt).toContain(
        'featuring the storybook title text "Prophet Adam: The Beginning" in bold glowing 3D embossed golden storybook typography at the top',
      )
      expect(prompt).toContain("Lush, magical ancient gardens of Paradise")
    })

    it("formats custom cover_prompt to ensure it includes the title text", () => {
      const customPrompt =
        "A peaceful ancient oasis under glowing stars, Pixar 3D style, 16:9 aspect ratio."
      const prompt = getCanvaDreamLabPrompt({
        title: "The Great Journey",
        cover_prompt: customPrompt,
      })

      expect(prompt).toContain('featuring the storybook title text "The Great Journey"')
    })
  })

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

    it("strips em dashes from scene titles and paragraph bodies automatically", () => {
      const storyWithDashes = `### Scene 1: The Beginning—A Fresh Start
Before time—Allah created the universe.

### Scene 2: The Choice—Good or Pride
Iblis said—I am better than him!

### Scene 3: The Secret—Asking Forgiveness
They whispered—Our Lord forgive us.`

      const scenes = parseStoryScenes(storyWithDashes)
      expect(scenes).toHaveLength(3)
      expect(scenes[0].title).not.toContain("—")
      expect(scenes[0].paragraphs[0]).not.toContain("—")
      expect(scenes[0].paragraphs[0]).toBe("Before time, Allah created the universe.")
      expect(scenes[1].title).not.toContain("—")
      expect(scenes[1].paragraphs[0]).toBe("Iblis said, I am better than him!")
      expect(scenes[2].paragraphs[0]).toBe("They whispered, Our Lord forgive us.")
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

