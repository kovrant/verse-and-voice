// Pure Namaz helpers — no Supabase import so they're unit-testable.

export type NamazModuleStatus = "learning" | "completed"

export interface NamazStep {
  id: string
  title: string
  order_index: number
  image_url: string | null
  card_color: string
}

export interface NamazStepPart {
  id: string
  step_id: string
  title: string
  order_index: number
  image_url: string | null
}

export interface StudentNamaz {
  id: string
  student_id: string
  status: NamazModuleStatus
  assigned_at: string
  completed_at: string | null
  last_revised_at: string | null
  notes: string | null
}

export interface StudentNamazStep {
  id: string
  student_id: string
  step_id: string
  unlocked_at: string | null
  last_viewed_at: string | null
  completed_at: string | null
  revision_assigned_at: string | null
  last_revised_at: string | null
  revision_count: number
}

export interface StudentNamazPart {
  id: string
  student_id: string
  part_id: string
  revision_assigned_at: string | null
  last_revised_at: string | null
  revision_count: number
}

export const NAMAZ_STEP_SELECT = "id, title, order_index, image_url, card_color"
export const NAMAZ_PART_SELECT = "id, step_id, title, order_index, image_url"
export const STUDENT_NAMAZ_SELECT =
  "id, student_id, status, assigned_at, completed_at, last_revised_at, notes"
export const STUDENT_NAMAZ_STEP_SELECT =
  "id, student_id, step_id, unlocked_at, last_viewed_at, completed_at, revision_assigned_at, last_revised_at, revision_count"
export const STUDENT_NAMAZ_PART_SELECT =
  "id, student_id, part_id, revision_assigned_at, last_revised_at, revision_count"

export const NAMAZ_COMPLETE_BADGE_SLUG = "namaz_complete"

/** Preset swatches for the teacher step editor. */
export const NAMAZ_CARD_COLORS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#dc2626",
  "#0891b2",
  "#16a34a",
] as const

export function stepProgressByStepId(
  rows: StudentNamazStep[],
): Map<string, StudentNamazStep> {
  return new Map(rows.map((r) => [r.step_id, r]))
}

export function partProgressByPartId(
  rows: StudentNamazPart[],
): Map<string, StudentNamazPart> {
  return new Map(rows.map((r) => [r.part_id, r]))
}

/** Unlocked steps stay open during learning — including after teacher marks them complete. */
export function isStepUnlockedForLearning(
  progress: StudentNamazStep | undefined,
  moduleStatus: NamazModuleStatus,
): boolean {
  if (moduleStatus === "completed") return false
  return !!progress?.unlocked_at
}

export function isStepUnlockedForWholeStepRevision(
  progress: StudentNamazStep | undefined,
  moduleStatus: NamazModuleStatus,
  hasParts: boolean,
): boolean {
  if (moduleStatus !== "completed" || hasParts) return false
  return !!progress?.completed_at && !!progress.revision_assigned_at
}

export function isStepOpenForRevision(
  progress: StudentNamazStep | undefined,
  moduleStatus: NamazModuleStatus,
  parts: NamazStepPart[],
  partProgress: Map<string, StudentNamazPart>,
): boolean {
  if (moduleStatus !== "completed" || !progress?.completed_at) return false
  if (parts.length === 0) return isStepUnlockedForWholeStepRevision(progress, moduleStatus, false)
  return parts.some((p) => !!partProgress.get(p.id)?.revision_assigned_at)
}

export function isStepCardClickable(
  step: NamazStep,
  progress: StudentNamazStep | undefined,
  moduleStatus: NamazModuleStatus,
  parts: NamazStepPart[],
  partProgress: Map<string, StudentNamazPart>,
): boolean {
  if (moduleStatus === "learning") return isStepUnlockedForLearning(progress, moduleStatus)
  return isStepOpenForRevision(progress, moduleStatus, parts, partProgress)
}

export function currentLearningStep(
  steps: NamazStep[],
  progress: Map<string, StudentNamazStep>,
): NamazStep | null {
  for (const step of [...steps].sort((a, b) => a.order_index - b.order_index)) {
    const row = progress.get(step.id)
    if (row?.unlocked_at && !row.completed_at) return step
  }
  return null
}

export function activeRevisionPart(
  parts: NamazStepPart[],
  partProgress: Map<string, StudentNamazPart>,
): NamazStepPart | null {
  for (const part of [...parts].sort((a, b) => a.order_index - b.order_index)) {
    if (partProgress.get(part.id)?.revision_assigned_at) return part
  }
  return null
}

export function learningProgress(
  steps: NamazStep[],
  progress: Map<string, StudentNamazStep>,
): { done: number; total: number } {
  const total = steps.length
  const done = steps.filter((s) => !!progress.get(s.id)?.completed_at).length
  return { done, total }
}

/** All unlocked steps completed and every catalog step has a completed row. */
export function isModuleReadyToComplete(
  steps: NamazStep[],
  progress: Map<string, StudentNamazStep>,
): boolean {
  if (steps.length === 0) return false
  return steps.every((step) => {
    const row = progress.get(step.id)
    return !!row?.unlocked_at && !!row.completed_at
  })
}

export interface PartRevisionStat {
  part: NamazStepPart
  revision_count: number
  last_revised_at: string | null
  revision_assigned_at: string | null
}

/** Teacher insight: highest revision counts first. */
export function partRevisionStats(
  parts: NamazStepPart[],
  partProgress: Map<string, StudentNamazPart>,
): PartRevisionStat[] {
  return [...parts]
    .sort((a, b) => a.order_index - b.order_index)
    .map((part) => {
      const row = partProgress.get(part.id)
      return {
        part,
        revision_count: row?.revision_count ?? 0,
        last_revised_at: row?.last_revised_at ?? null,
        revision_assigned_at: row?.revision_assigned_at ?? null,
      }
    })
    .sort((a, b) => b.revision_count - a.revision_count || a.part.order_index - b.part.order_index)
}

export function partsForStep(stepId: string, parts: NamazStepPart[]): NamazStepPart[] {
  return parts.filter((p) => p.step_id === stepId).sort((a, b) => a.order_index - b.order_index)
}
