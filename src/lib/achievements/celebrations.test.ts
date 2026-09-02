import { describe, expect, it } from "vitest"

import {
  findNewAchievementIds,
  hasUnseenAchievements,
} from "./celebrations"

describe("findNewAchievementIds", () => {
  it("baselines on first visit without celebrating", () => {
    expect(findNewAchievementIds(["a", "b"], null)).toEqual({
      newIds: [],
      baselineIds: ["a", "b"],
    })
  })

  it("returns only ids not seen before", () => {
    expect(findNewAchievementIds(["a", "b", "c"], ["a", "b"])).toEqual({
      newIds: ["c"],
      baselineIds: null,
    })
  })
})

describe("hasUnseenAchievements", () => {
  it("is false before baseline exists", () => {
    expect(hasUnseenAchievements(["a"], null)).toBe(false)
  })

  it("is true when a new id appears after baseline", () => {
    expect(hasUnseenAchievements(["a", "b"], ["a"])).toBe(true)
  })
})
