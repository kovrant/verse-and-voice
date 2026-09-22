import { describe, expect, it } from "vitest"

import {
  calculateHadithStats,
  getEligibleHadithBadgeSlugs,
  getHadithNextMilestone,
  HADITH_TOPICS,
  splitArabicWords,
} from "./hadith-engine"
import { HADITH_BADGE_SLUGS, type HadithWithProgress } from "./types"

describe("Hadith Engine", () => {
  it("calculates eligible badge slugs correctly", () => {
    expect(getEligibleHadithBadgeSlugs(0)).toEqual([])
    expect(getEligibleHadithBadgeSlugs(1)).toEqual([HADITH_BADGE_SLUGS.STARTER])
    expect(getEligibleHadithBadgeSlugs(4)).toEqual([HADITH_BADGE_SLUGS.STARTER])
    expect(getEligibleHadithBadgeSlugs(5)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
    ])
    expect(getEligibleHadithBadgeSlugs(10)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
      HADITH_BADGE_SLUGS.SEEKER,
    ])
    expect(getEligibleHadithBadgeSlugs(15)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
      HADITH_BADGE_SLUGS.SEEKER,
      HADITH_BADGE_SLUGS.CHAMPION,
    ])
    expect(getEligibleHadithBadgeSlugs(25)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
      HADITH_BADGE_SLUGS.SEEKER,
      HADITH_BADGE_SLUGS.CHAMPION,
      HADITH_BADGE_SLUGS.GUARDIAN,
    ])
    expect(getEligibleHadithBadgeSlugs(40)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
      HADITH_BADGE_SLUGS.SEEKER,
      HADITH_BADGE_SLUGS.CHAMPION,
      HADITH_BADGE_SLUGS.GUARDIAN,
      HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR,
    ])
    expect(getEligibleHadithBadgeSlugs(50)).toEqual([
      HADITH_BADGE_SLUGS.STARTER,
      HADITH_BADGE_SLUGS.EXPLORER,
      HADITH_BADGE_SLUGS.SEEKER,
      HADITH_BADGE_SLUGS.CHAMPION,
      HADITH_BADGE_SLUGS.GUARDIAN,
      HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR,
      HADITH_BADGE_SLUGS.GRAND_SCHOLAR,
    ])
  })

  it("calculates next milestone targets", () => {
    const m0 = getHadithNextMilestone(0)
    expect(m0.target).toBe(1)
    expect(m0.isComplete).toBe(false)

    const m1 = getHadithNextMilestone(2)
    expect(m1.target).toBe(5)
    expect(m1.percentage).toBe(40)
    expect(m1.isComplete).toBe(false)

    const m5 = getHadithNextMilestone(6)
    expect(m5.target).toBe(10)
    expect(m5.percentage).toBe(60)
    expect(m5.isComplete).toBe(false)

    const m10 = getHadithNextMilestone(12)
    expect(m10.target).toBe(15)
    expect(m10.percentage).toBe(80)
    expect(m10.isComplete).toBe(false)

    const m15 = getHadithNextMilestone(20)
    expect(m15.target).toBe(25)
    expect(m15.percentage).toBe(80)
    expect(m15.isComplete).toBe(false)

    const m25 = getHadithNextMilestone(30)
    expect(m25.target).toBe(40)
    expect(m25.percentage).toBe(75)
    expect(m25.isComplete).toBe(false)

    const m40 = getHadithNextMilestone(45)
    expect(m40.target).toBe(50)
    expect(m40.percentage).toBe(90)
    expect(m40.isComplete).toBe(false)

    const m50 = getHadithNextMilestone(50)
    expect(m50.isComplete).toBe(true)
    expect(m50.percentage).toBe(100)
  })

  it("calculates collection stats", () => {
    const mockHadiths: HadithWithProgress[] = [
      {
        id: "1",
        hadith_number: 1,
        title: "H1",
        arabic_text: "text 1",
        english_text: "eng 1",
        urdu_text: "urdu 1",
        kids_lesson: "lesson 1",
        narrator: "Abu Hurairah",
        reference: "Bukhari",
        topic: "manners",
        order_index: 1,
        is_published: true,
        created_at: "",
        updated_at: "",
        progress: {
          id: "p1",
          student_id: "s1",
          hadith_id: "1",
          status: "memorized",
          updated_at: "",
        },
        is_assigned: true,
      },
      {
        id: "2",
        hadith_number: 2,
        title: "H2",
        arabic_text: "text 2",
        english_text: "eng 2",
        urdu_text: "urdu 2",
        kids_lesson: "lesson 2",
        narrator: "Aisha",
        reference: "Muslim",
        topic: "cleanliness",
        order_index: 2,
        is_published: true,
        created_at: "",
        updated_at: "",
        progress: {
          id: "p2",
          student_id: "s1",
          hadith_id: "2",
          status: "memorizing",
          updated_at: "",
        },
      },
      {
        id: "3",
        hadith_number: 3,
        title: "H3",
        arabic_text: "text 3",
        english_text: "eng 3",
        urdu_text: "urdu 3",
        kids_lesson: "lesson 3",
        narrator: "Ibn Umar",
        reference: "Tirmidhi",
        topic: "knowledge",
        order_index: 3,
        is_published: true,
        created_at: "",
        updated_at: "",
      },
    ]

    const stats = calculateHadithStats(mockHadiths)
    expect(stats.total).toBe(3)
    expect(stats.memorized).toBe(1)
    expect(stats.memorizing).toBe(1)
    expect(stats.reading).toBe(0)
    expect(stats.assignedCount).toBe(1)
  })

  it("splits Arabic words cleanly", () => {
    const text = "الطهور شطر الإيمان"
    const words = splitArabicWords(text)
    expect(words).toEqual(["الطهور", "شطر", "الإيمان"])
  })

  it("has valid topics definition", () => {
    expect(HADITH_TOPICS.manners.label).toBeDefined()
    expect(HADITH_TOPICS.cleanliness.urduLabel).toBeDefined()
    expect(HADITH_TOPICS.knowledge.icon).toBeDefined()
  })
})
