import { describe, expect, it } from "vitest"

import {
  getQuickPickRules,
  getRulesByCategory,
  searchRules,
  TAJWEED_CATEGORIES,
  TAJWEED_RULES,
} from "./rules"

describe("Tajweed Rules Catalog", () => {
  it("contains valid rule definitions with required properties", () => {
    expect(TAJWEED_RULES.length).toBeGreaterThanOrEqual(15)

    for (const rule of TAJWEED_RULES) {
      expect(rule.id).toBeTruthy()
      expect(rule.title).toBeTruthy()
      expect(rule.nameUrdu).toBeTruthy()
      expect(rule.category).toBeTruthy()
      expect(rule.shortCue).toBeTruthy()
      expect(rule.explanation).toBeTruthy()
      expect(rule.examples.length).toBeGreaterThan(0)
      expect(rule.color).toBeTruthy()
    }
  })

  it("provides quick-pick rules for common recitation mistakes", () => {
    const quickPicks = getQuickPickRules()
    expect(quickPicks.length).toBeGreaterThanOrEqual(6)

    const slugs = quickPicks.map((r) => r.slug)
    expect(slugs).toContain("zabar")
    expect(slugs).toContain("zer")
    expect(slugs).toContain("pesh")
    expect(slugs).toContain("sukoon")
    expect(slugs).toContain("tashdeed")
    expect(slugs).toContain("qalqalah")
    expect(slugs).toContain("ghunnah")
  })

  it("filters rules by category correctly", () => {
    for (const cat of TAJWEED_CATEGORIES) {
      const rules = getRulesByCategory(cat.id)
      expect(rules.length).toBeGreaterThan(0)
      expect(rules.every((r) => r.category === cat.id)).toBe(true)
    }
  })

  it("searches rules by English, Urdu, and slug", () => {
    const zabarResults = searchRules("zabar")
    expect(zabarResults.some((r) => r.slug === "zabar")).toBe(true)

    const urduResults = searchRules("قلقلہ")
    expect(urduResults.some((r) => r.slug === "qalqalah")).toBe(true)

    const emptyResults = searchRules("")
    expect(emptyResults.length).toBe(TAJWEED_RULES.length)
  })
})
