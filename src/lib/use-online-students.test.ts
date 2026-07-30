import { describe, expect, it, vi } from "vitest"

// The module under test imports the browser Supabase client at load (which
// needs env + a real client). Stub it so the pure targeting helper can be
// imported in a plain node test.
vi.mock("@/lib/supabase", () => ({ supabase: {} }))

import { shouldForceSignOut } from "./use-online-students"

describe("shouldForceSignOut targeting", () => {
  it("signs out only the student the broadcast names", () => {
    expect(shouldForceSignOut({ studentId: "abc" }, "abc")).toBe(true)
    expect(shouldForceSignOut({ studentId: "abc" }, "xyz")).toBe(false)
  })

  it("ignores malformed or empty payloads", () => {
    expect(shouldForceSignOut(null, "abc")).toBe(false)
    expect(shouldForceSignOut(undefined, "abc")).toBe(false)
    expect(shouldForceSignOut({}, "abc")).toBe(false)
  })
})
