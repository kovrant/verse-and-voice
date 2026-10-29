import { describe, expect, it } from "vitest"

import { AVATAR_VARIANTS, studentAvatarSrc } from "./student-avatar"

describe("studentAvatarSrc", () => {
  it("is null until boy/girl is set", () => {
    expect(studentAvatarSrc("abc", null)).toBeNull()
    expect(studentAvatarSrc("abc", undefined)).toBeNull()
  })

  it("keeps the same image for the same student", () => {
    const id = "6f1c2a4e-1d2b-4c3d-9e8f-0a1b2c3d4e5f"
    expect(studentAvatarSrc(id, "girl")).toBe(studentAvatarSrc(id, "girl"))
  })

  it("picks from the gender's variants", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `student-${i}`)
    const seen = new Set(ids.map((id) => studentAvatarSrc(id, "boy")))
    for (const src of Array.from(seen)) expect(src).toMatch(/^\/avatars\/boy-[1-4]\.png$/)
    expect(seen.size).toBe(AVATAR_VARIANTS)
  })
})
