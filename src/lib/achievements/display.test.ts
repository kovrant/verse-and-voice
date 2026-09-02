import { describe, expect, it } from "vitest"

import { groupTrophies, parseMemPartTitle, trophyHeadline } from "./display"
import type { TrophyItem } from "./display"

function item(partial: Partial<TrophyItem> & Pick<TrophyItem, "slug" | "domain" | "title">): TrophyItem {
  return {
    description: null,
    earned_at: "2026-01-01",
    issues_certificate: false,
    ...partial,
  }
}

describe("parseMemPartTitle", () => {
  it("splits part label and lesson title", () => {
    expect(parseMemPartTitle("Part 3 · Duain note")).toEqual({
      partLabel: "Part 3",
      lessonTitle: "Duain note",
    })
  })
})

describe("groupTrophies", () => {
  it("groups memorization parts under their lesson", () => {
    const grouped = groupTrophies([
      item({ slug: "mem_part_a", domain: "memorization", title: "Part 1 · Duain note" }),
      item({ slug: "mem_part_b", domain: "memorization", title: "Part 2 · Duain note" }),
      item({ slug: "mem_lesson_x", domain: "memorization", title: "Duain note" }),
      item({ slug: "para_01", domain: "quran", title: "Para 1" }),
    ])
    expect(grouped.quranParas).toEqual([1])
    expect(grouped.memorization).toHaveLength(1)
    expect(grouped.memorization[0].lessonTitle).toBe("Duain note")
    expect(grouped.memorization[0].parts).toHaveLength(2)
    expect(grouped.memorization[0].complete?.slug).toBe("mem_lesson_x")
  })
})

describe("trophyHeadline", () => {
  it("counts lessons not individual parts", () => {
    const grouped = groupTrophies([
      item({ slug: "mem_part_a", domain: "memorization", title: "Part 1 · Duain note" }),
      item({ slug: "mem_lesson_x", domain: "memorization", title: "Duain note" }),
      item({ slug: "para_01", domain: "quran", title: "Para 1" }),
    ])
    expect(trophyHeadline(grouped, 1)).toContain("1 lesson")
    expect(trophyHeadline(grouped, 1)).not.toContain("2 lesson")
  })
})
