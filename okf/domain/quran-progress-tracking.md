---
type: domain-concept
title: "Quran Progress Tracking and Round Mathematics"
description: "Bidirectional Quran reading progression logic, round completion formula, and Khatm accounting."
status: stable
verified: true
sources:
  - "src/components/quran-progress.tsx"
  - "src/components/quran-progress.test.ts"
  - "src/components/quran-journey.tsx"
  - "README.md"
tags:
  - domain
  - quran
  - math
  - rounds
---

# Quran Progress Tracking and Round Mathematics

Progress through the Quran (30 Paras / Juz) is organized into **Rounds**. A student may complete multiple rounds (Khatms) across their learning lifecycle.

---

## 📐 Bidirectional Reading Logic

Traditional Quranic pedagogy at the academy often teaches memorization/recitation from two directions simultaneously:
1. **Descending Paras (`desc_completed`):** Counting downwards from Para 30 (e.g., Amma para, Mulk, etc. downwards).
2. **Ascending Paras (`asc_completed`):** The para currently being recited starting from Para 1 upwards.

### Mathematical Invariants
The total completed paras in an active round is determined by:

$$\text{completed} = \text{desc\_completed} + \max(\text{asc\_completed} - 1, 0)$$

```typescript
// src/components/quran-progress.tsx
export function computeProgress(desc: number, asc: number) {
  const completedFromAsc = asc > 0 ? asc - 1 : 0
  const total = desc + completedFromAsc
  const isCompleted = total >= 30

  let currentPara: number | null = null
  if (!isCompleted && asc > 0) {
    currentPara = asc
  }

  return { currentPara, total, isCompleted }
}
```

> [!CAUTION]
> **Impossible States (The 59/30 Bug):**  
> When a round is finished, `desc_completed` must be set to `30` and `asc_completed` set to `0`.  
> Setting `desc = 30` and `asc = 30` causes the formula to evaluate to `30 + 29 = 59` completed paras.

---

## 🎯 Active Round Resolution (`getActiveRound`)

Students may have completed rounds in the past, or historical rows saved out of chronological sequence:

```typescript
// src/components/quran-progress.tsx
export function getActiveRound(rounds: QuranRound[]): QuranRound | null {
  const incomplete = rounds.filter((r) => !r.completed_at)
  if (incomplete.length === 0) return null
  return incomplete.reduce((latest, r) => {
    const cmp = r.started_at.localeCompare(latest.started_at)
    if (cmp > 0) return r
    if (cmp === 0 && r.round_number > latest.round_number) return r
    return latest
  })
}
```

* **Selection Rule:** The active round is defined as the **LATEST incomplete round** (sorted by `started_at` then `round_number`), never simply `rounds[0]`.
* **Khatm Condition:** When `completedQuranCount > 0` and `activeRound === null`, the student is between rounds and has completed all 30 Paras.
