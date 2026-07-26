import { describe, expect, it } from "vitest"

import {
  formatClassTimeLocal,
  formatCountdown,
  msUntilNextClass,
  parseTime,
  toInputTime,
  toPktClassTime,
} from "./class-time"

describe("parseTime", () => {
  it("returns empty parts for empty or unparseable input", () => {
    expect(parseTime("")).toEqual({ hour: "", minute: "", period: "" })
    expect(parseTime("nonsense")).toEqual({ hour: "", minute: "", period: "" })
  })

  it("parses 'h:mm AM/PM PKT' and without the timezone label", () => {
    expect(parseTime("8:00 AM PKT")).toEqual({ hour: "8", minute: "00", period: "AM" })
    expect(parseTime("10:15 PM PKT")).toEqual({ hour: "10", minute: "15", period: "PM" })
    expect(parseTime("5:30 pm")).toEqual({ hour: "5", minute: "30", period: "PM" })
  })
})

describe("toPktClassTime / toInputTime", () => {
  it("round-trips through native HH:mm", () => {
    expect(toPktClassTime("08:00")).toBe("8:00 AM PKT")
    expect(toPktClassTime("17:15")).toBe("5:15 PM PKT")
    expect(toPktClassTime("00:00")).toBe("12:00 AM PKT")
    expect(toPktClassTime("12:00")).toBe("12:00 PM PKT")
    expect(toInputTime("8:00 AM PKT")).toBe("08:00")
    expect(toInputTime("5:15 PM PKT")).toBe("17:15")
    expect(toInputTime("")).toBe("")
  })
})

// class_time is PKT (UTC+5). Tests use absolute UTC instants so they pass
// regardless of the machine's local timezone.
// 5:00 PM PKT === 17:00 PKT === 12:00 UTC.
describe("msUntilNextClass", () => {
  it("counts down to a class later today (from any viewer timezone)", () => {
    const now = new Date(Date.UTC(2026, 0, 10, 10, 0, 0)) // 10:00 UTC = 3:00 PM PKT
    expect(msUntilNextClass("5:00 PM PKT", now)).toBe(2 * 60 * 60 * 1000)
  })

  it("rolls over to tomorrow once the PKT time has passed", () => {
    const now = new Date(Date.UTC(2026, 0, 10, 13, 0, 0)) // 13:00 UTC = 6:00 PM PKT
    expect(msUntilNextClass("5:00 PM PKT", now)).toBe(23 * 60 * 60 * 1000)
  })

  it("handles 12-hour edge cases (12:00 PM = noon PKT, 12:00 AM = midnight PKT)", () => {
    // noon PKT = 07:00 UTC
    expect(msUntilNextClass("12:00 PM PKT", new Date(Date.UTC(2026, 0, 10, 6, 30)))).toBe(
      30 * 60 * 1000,
    )
    // midnight PKT (00:00) = 19:00 UTC previous day
    expect(msUntilNextClass("12:00 AM PKT", new Date(Date.UTC(2026, 0, 10, 18, 30)))).toBe(
      30 * 60 * 1000,
    )
  })

  it("returns null for missing or unparseable class time", () => {
    expect(msUntilNextClass(null)).toBeNull()
    expect(msUntilNextClass("")).toBeNull()
    expect(msUntilNextClass("whenever")).toBeNull()
  })
})

describe("formatClassTimeLocal", () => {
  it("returns a formatted time string for valid input, null otherwise", () => {
    expect(formatClassTimeLocal("5:00 PM PKT")).toMatch(/\d{1,2}:\d{2}/)
    expect(formatClassTimeLocal(null)).toBeNull()
    expect(formatClassTimeLocal("nope")).toBeNull()
  })
})

describe("formatCountdown", () => {
  it("formats hours and minutes", () => {
    expect(formatCountdown(2 * 60 * 60 * 1000 + 15 * 60 * 1000)).toBe("2h 15m")
    expect(formatCountdown(45 * 60 * 1000)).toBe("45m")
    expect(formatCountdown(30 * 1000)).toBe("now")
  })
})
