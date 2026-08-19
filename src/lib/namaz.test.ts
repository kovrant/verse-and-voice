import { describe, expect, it } from "vitest"

import {
  activeRevisionPart,
  currentLearningStep,
  isModuleReadyToComplete,
  isStepCardClickable,
  isStepUnlockedForLearning,
  partRevisionStats,
  stepProgressByStepId,
  type NamazStep,
  type NamazStepPart,
  type StudentNamazPart,
  type StudentNamazStep,
} from "./namaz"

const steps: NamazStep[] = [
  { id: "s1", title: "Takbir", order_index: 0, image_url: null, card_color: "#0d9488" },
  { id: "s2", title: "Qiyam", order_index: 1, image_url: null, card_color: "#2563eb" },
]

const parts: NamazStepPart[] = [
  { id: "p1", step_id: "s2", title: "Sana", order_index: 0, image_url: null },
  { id: "p2", step_id: "s2", title: "Al-Fatiha", order_index: 1, image_url: null },
]

function stepRow(overrides: Partial<StudentNamazStep>): StudentNamazStep {
  return {
    id: "r1",
    student_id: "st1",
    step_id: "s1",
    unlocked_at: null,
    last_viewed_at: null,
    completed_at: null,
    revision_assigned_at: null,
    last_revised_at: null,
    revision_count: 0,
    ...overrides,
  }
}

describe("isStepUnlockedForLearning", () => {
  it("requires unlock while learning; completed steps stay openable", () => {
    expect(isStepUnlockedForLearning(undefined, "learning")).toBe(false)
    expect(isStepUnlockedForLearning(stepRow({ unlocked_at: "2026-01-01" }), "learning")).toBe(true)
    expect(
      isStepUnlockedForLearning(
        stepRow({ unlocked_at: "2026-01-01", completed_at: "2026-01-02" }),
        "learning",
      ),
    ).toBe(true)
  })
})

describe("currentLearningStep", () => {
  it("returns first unlocked incomplete step in order", () => {
    const progress = stepProgressByStepId([
      stepRow({ step_id: "s1", unlocked_at: "a", completed_at: "b" }),
      stepRow({ id: "r2", step_id: "s2", unlocked_at: "a" }),
    ])
    expect(currentLearningStep(steps, progress)?.title).toBe("Qiyam")
  })
})

describe("isModuleReadyToComplete", () => {
  it("needs every catalog step unlocked and completed", () => {
    const partial = stepProgressByStepId([
      stepRow({ step_id: "s1", unlocked_at: "a", completed_at: "b" }),
    ])
    expect(isModuleReadyToComplete(steps, partial)).toBe(false)

    const done = stepProgressByStepId([
      stepRow({ step_id: "s1", unlocked_at: "a", completed_at: "b" }),
      stepRow({ id: "r2", step_id: "s2", unlocked_at: "a", completed_at: "b" }),
    ])
    expect(isModuleReadyToComplete(steps, done)).toBe(true)
  })
})

describe("revision clickability", () => {
  it("opens step when assigned part revision is active", () => {
    const progress = stepProgressByStepId([
      stepRow({
        step_id: "s2",
        unlocked_at: "a",
        completed_at: "b",
      }),
    ])
    const partProgress = new Map<string, StudentNamazPart>([
      [
        "p1",
        {
          id: "pr1",
          student_id: "st1",
          part_id: "p1",
          revision_assigned_at: "2026-01-03",
          last_revised_at: null,
          revision_count: 0,
        },
      ],
    ])
    expect(
      isStepCardClickable(steps[1], progress.get("s2"), "completed", parts, partProgress),
    ).toBe(true)
  })

  it("whole-step revision works when step has no parts", () => {
    const progress = stepProgressByStepId([
      stepRow({
        unlocked_at: "a",
        completed_at: "b",
        revision_assigned_at: "2026-01-03",
      }),
    ])
    expect(isStepCardClickable(steps[0], progress.get("s1"), "completed", [], new Map())).toBe(true)
  })
})

describe("partRevisionStats", () => {
  it("sorts by revision_count descending", () => {
    const stats = partRevisionStats(parts, new Map([
      ["p1", { id: "a", student_id: "st1", part_id: "p1", revision_assigned_at: null, last_revised_at: "x", revision_count: 7 }],
      ["p2", { id: "b", student_id: "st1", part_id: "p2", revision_assigned_at: null, last_revised_at: "y", revision_count: 2 }],
    ]))
    expect(stats[0].part.title).toBe("Sana")
    expect(stats[0].revision_count).toBe(7)
  })
})

describe("activeRevisionPart", () => {
  it("returns first assigned part in order", () => {
    const assigned = activeRevisionPart(
      parts,
      new Map([
        [
          "p2",
          {
            id: "b",
            student_id: "st1",
            part_id: "p2",
            revision_assigned_at: "now",
            last_revised_at: null,
            revision_count: 0,
          },
        ],
      ]),
    )
    expect(assigned?.title).toBe("Al-Fatiha")
  })
})
