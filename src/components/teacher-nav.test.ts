import { describe, expect, it } from "vitest"

import { navItemFor, tabsFor } from "./teacher-nav"

describe("navItemFor", () => {
  it("lights Today only on the dashboard itself and the class page", () => {
    expect(navItemFor("/teacher")?.label).toBe("Today")
    expect(navItemFor("/teacher/class")?.label).toBe("Today")
    expect(navItemFor("/teacher/fees")?.label).toBe("Fees")
  })

  it("groups tab pages and their detail views under one section", () => {
    expect(navItemFor("/teacher/quran")?.label).toBe("Students")
    expect(navItemFor("/teacher/students/abc")?.label).toBe("Students")
    expect(navItemFor("/teacher/quizzes/abc")?.label).toBe("Library")
    expect(navItemFor("/teacher/ai-usage")?.label).toBe("Settings")
  })

  it("does not match a path that only shares a prefix", () => {
    expect(navItemFor("/teacher/feesx")).toBeUndefined()
  })
})

describe("tabsFor", () => {
  it("shows tabs on a tab's own page only", () => {
    expect(tabsFor("/teacher/hadiths")?.length).toBe(7)
    expect(tabsFor("/teacher/quizzes/abc")).toBeNull()
    expect(tabsFor("/teacher/students/new")).toBeNull()
    expect(tabsFor("/teacher/fees")).toBeNull()
  })
})
