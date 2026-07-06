import { describe, it, expect } from "vitest"
import { parseTime } from "./time-picker"

// Bug 4 — parseTime("") must return EMPTY parts (not a fabricated 8:00 AM),
// otherwise the picker writes a fake time into forms on mount.
describe("parseTime", () => {
  it("returns empty parts for an empty value", () => {
    expect(parseTime("")).toEqual({ hour: "", minute: "", period: "" })
  })

  it("returns empty parts for unparseable input", () => {
    expect(parseTime("nonsense")).toEqual({ hour: "", minute: "", period: "" })
  })

  it("parses a full 'h:mm AM/PM PKT' string", () => {
    expect(parseTime("8:00 AM PKT")).toEqual({ hour: "8", minute: "00", period: "AM" })
    expect(parseTime("10:15 PM PKT")).toEqual({ hour: "10", minute: "15", period: "PM" })
  })

  it("parses without the trailing timezone label", () => {
    expect(parseTime("5:30 pm")).toEqual({ hour: "5", minute: "30", period: "PM" })
  })
})
