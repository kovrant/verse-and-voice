import { describe, expect, it } from "vitest"

import { AVATARS, studentAvatarSrc } from "./student-avatar"

describe("studentAvatarSrc", () => {
  it("is null until boy/girl is set", () => {
    expect(studentAvatarSrc("abc", null)).toBeNull()
    expect(studentAvatarSrc("abc", undefined)).toBeNull()
  })

  it("keeps the same image for the same student", () => {
    const id = "6f1c2a4e-1d2b-4c3d-9e8f-0a1b2c3d4e5f"
    expect(studentAvatarSrc(id, "girl")).toBe(studentAvatarSrc(id, "girl"))
  })

  it("only picks that gender's listed images", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `student-${i}`)
    for (const gender of ["boy", "girl"] as const) {
      const allowed = new Set(AVATARS[gender].map((f) => `/avatars/${f}`))
      for (const id of ids) expect(allowed.has(studentAvatarSrc(id, gender)!)).toBe(true)
    }
  })
})
