import { describe, expect, it } from "vitest"

import {
  DEDUPE_WINDOW_MINUTES,
  dedupeCutoffIso,
  getNotificationActionLabel,
  getNotificationCategory,
  groupNotificationsByDate,
  retentionCutoffIso,
  sanitizeSearchTerm,
} from "./notifications"

describe("sanitizeSearchTerm", () => {
  it("removes characters that break PostgREST .or() ilike filters", () => {
    expect(sanitizeSearchTerm("fee, 50% (urgent)")).toBe("fee 50 urgent")
    expect(sanitizeSearchTerm("hello_world")).toBe("hello world")
  })

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  a   b  ")).toBe("a b")
    expect(sanitizeSearchTerm("")).toBe("")
  })
})

describe("retentionCutoffIso", () => {
  it("returns the timestamp exactly two months before the given date", () => {
    const cutoff = retentionCutoffIso(new Date("2026-03-15T12:00:00.000Z"))
    expect(cutoff).toBe(new Date("2026-01-15T12:00:00.000Z").toISOString())
  })
})

describe("dedupeCutoffIso", () => {
  it("returns the timestamp one window before the given date", () => {
    const cutoff = dedupeCutoffIso(new Date("2026-03-15T12:00:00.000Z"))
    expect(cutoff).toBe(new Date("2026-03-15T11:55:00.000Z").toISOString())
  })

  // A duplicate fired moments after the original must fall inside the window
  // (suppressed); a genuine repeat well after it must fall outside (delivered).
  it("brackets a repeat notification correctly", () => {
    const now = new Date("2026-03-15T12:00:00.000Z")
    const cutoff = dedupeCutoffIso(now)
    const remountSeconds = new Date(now.getTime() - 2_000).toISOString()
    const nextSession = new Date(now.getTime() - (DEDUPE_WINDOW_MINUTES + 1) * 60_000).toISOString()

    expect(remountSeconds >= cutoff).toBe(true)
    expect(nextSession >= cutoff).toBe(false)
  })
})

describe("getNotificationCategory", () => {
  it("categorizes live class and session events under classes", () => {
    expect(getNotificationCategory("live_class", "Your class is live")).toBe("classes")
    expect(getNotificationCategory("live_class", "Asim joined the class")).toBe("classes")
    expect(getNotificationCategory("session", "Class with Asim · 45 min")).toBe("classes")
    expect(getNotificationCategory(null, "Teacher started the class")).toBe("classes")
  })

  it("categorizes achievements, trophies, and streaks under trophies", () => {
    expect(getNotificationCategory("achievement", "Asim earned 7-Day Streak")).toBe("trophies")
    expect(getNotificationCategory("trophy", "Round complete · 30 Paras")).toBe("trophies")
    expect(getNotificationCategory("streak", "New streak milestone")).toBe("trophies")
  })

  it("categorizes memorization and revision under memorization", () => {
    expect(getNotificationCategory("memorization", "Memorized Surah Al-Fatiha")).toBe("memorization")
    expect(getNotificationCategory("revision", "Revision assigned: Ayat al-Kursi")).toBe("memorization")
  })

  it("categorizes lesson and task assignments under assignments", () => {
    expect(getNotificationCategory("assignment", "New Namaz Step 3 assigned")).toBe("assignments")
    expect(getNotificationCategory(null, "Qaida Lesson 4 assigned")).toBe("assignments")
    expect(getNotificationCategory("namaz", "Namaz step unassigned")).toBe("assignments")
  })

  it("categorizes fee payments under fees", () => {
    expect(getNotificationCategory("fee_paid", "Asim paid March fee")).toBe("fees")
    expect(getNotificationCategory(null, "Tuition fee payment received")).toBe("fees")
  })

  it("categorizes student presence and generic events under general", () => {
    expect(getNotificationCategory("presence", "Asim logged in")).toBe("general")
    expect(getNotificationCategory("system", "System maintenance notice")).toBe("general")
  })
})

describe("getNotificationActionLabel", () => {
  it("resolves appropriate action button label based on category and title", () => {
    expect(getNotificationActionLabel("live_class", "Your class is live", "/student/classes")).toBe("Join Class")
    expect(getNotificationActionLabel("session", "Class with Asim", "/students/123")).toBe("View Session")
    expect(getNotificationActionLabel("achievement", "Asim earned Trophy", "/student/achievements")).toBe("View Trophy")
    expect(getNotificationActionLabel("revision", "Revision assigned", "/student/memorization")).toBe("Practice Now")
    expect(getNotificationActionLabel("assignment", "New step assigned", "/student/namaz")).toBe("Open Lesson")
    expect(getNotificationActionLabel("fee_paid", "Fee paid", "/student/fees")).toBe("View Receipt")
    expect(getNotificationActionLabel("presence", "Logged in", null)).toBeNull()
  })
})

describe("groupNotificationsByDate", () => {
  it("groups notifications into today, yesterday, thisWeek, and older", () => {
    const baseDate = new Date("2026-03-15T12:00:00.000Z")

    const items = [
      { id: "1", created_at: "2026-03-15T09:00:00.000Z" }, // today
      { id: "2", created_at: "2026-03-14T15:00:00.000Z" }, // yesterday
      { id: "3", created_at: "2026-03-11T10:00:00.000Z" }, // this week (4 days ago)
      { id: "4", created_at: "2026-02-15T12:00:00.000Z" }, // older (> 7 days)
    ]

    const grouped = groupNotificationsByDate(items, baseDate)
    expect(grouped.today.map((i) => i.id)).toEqual(["1"])
    expect(grouped.yesterday.map((i) => i.id)).toEqual(["2"])
    expect(grouped.thisWeek.map((i) => i.id)).toEqual(["3"])
    expect(grouped.older.map((i) => i.id)).toEqual(["4"])
  })
})
