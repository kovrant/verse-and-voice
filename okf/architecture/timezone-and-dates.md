---
type: architecture
title: "Timezone and Date Invariants"
description: "Rules governing Pakistan Standard Time (PKT UTC+5), date-only string manipulation, and preventing timezone-shift defects."
status: stable
verified: true
sources:
  - "src/lib/class-time.ts"
  - "src/lib/utils.ts"
  - "README.md"
  - "BUGS.md"
tags:
  - timezone
  - dates
  - invariants
  - pkt
---

# Timezone and Date Invariants

Timezone handling in Quran Academy has strict rules. Violating these rules causes silent errors such as dates rolling back by a day or class countdowns displaying wrong hours.

---

## 🕒 The Master Timezone: Pakistan Standard Time (PKT)

* **Zone:** `Asia/Karachi` (fixed **UTC+5**, zero Daylight Saving Time adjustments).
* **Storage Convention:** Class times in the database are stored as human-readable 12-hour strings:
  ```text
  "8:00 AM PKT"
  "10:30 PM PKT"
  ```

### ⚠️ Never Sort Class Times Lexically
`"10:00 AM"` sorts before `"2:00 PM"` alphabetically, but `"8:00 AM"` will sort after `"10:00 AM"`.
* Always sort schedules using `classTimeToMinutes(classTime)` (`src/lib/class-time.ts`), which converts the string to minutes since midnight in the PKT wall clock.

```typescript
// Correct sorting:
students.sort((a, b) => {
  const minA = classTimeToMinutes(a.class_time) ?? 9999
  const minB = classTimeToMinutes(b.class_time) ?? 9999
  return minA - minB
})
```

---

## 📅 Date-Only Columns vs Timestamps

The database stores dates in two distinct formats that must be handled differently:

| Column Type | Example Columns | Storage Format | Correct Parser | Prohibited Code |
|---|---|---|---|---|
| **Date-Only** | `quran_rounds.started_at`, `students.started_at` | `YYYY-MM-DD` | `parseLocalDate()` | `new Date("2026-01-15")` |
| **Timestamptz** | `class_sessions.started_at`, `created_at` | ISO 8601 with offset | `new Date()` | Custom string splits |

### The UTC Shift Bug
* When JavaScript parses a bare `YYYY-MM-DD` string via `new Date("2026-01-15")`, it treats it as **UTC midnight**.
* For any user or server located in negative UTC offsets (e.g., USA, Canada: UTC-5, UTC-8), UTC midnight evaluates to the **previous calendar day** (e.g., January 14 at 7:00 PM).
* **Mandatory Helpers:**
  * Parsing: Always use `parseLocalDate(val)` from `src/lib/utils.ts`.
  * Formatting: Always use `formatLocalDate(date)` from `src/lib/utils.ts`. Never use `date.toISOString().split("T")[0]`.
