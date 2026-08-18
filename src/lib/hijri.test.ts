import { describe, expect, it } from "vitest"

import { ordinalDay } from "./hijri"

describe("ordinalDay", () => {
  it("uses st/nd/rd/th, including the 11–13 teens", () => {
    expect(ordinalDay(1)).toBe("1st")
    expect(ordinalDay(2)).toBe("2nd")
    expect(ordinalDay(3)).toBe("3rd")
    expect(ordinalDay(4)).toBe("4th")
    expect(ordinalDay(11)).toBe("11th")
    expect(ordinalDay(12)).toBe("12th")
    expect(ordinalDay(13)).toBe("13th")
    expect(ordinalDay(21)).toBe("21st")
    expect(ordinalDay(22)).toBe("22nd")
    expect(ordinalDay(23)).toBe("23rd")
  })
})
