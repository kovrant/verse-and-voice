import { describe, expect, it } from "vitest"

import {
  CATEGORIES,
  CURATED_ISLAMIC_TOPICS,
  normalizeTopicSlug,
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
})
