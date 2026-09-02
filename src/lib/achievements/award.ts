import type { SupabaseClient } from "@supabase/supabase-js"

import { ensureDefinition, type EnsureDefinitionInput } from "./catalog"
import { issueCertificate } from "./certificates"
import type { AwardResult } from "./types"

async function notifyTeachers(studentId: string, title: string): Promise<void> {
  try {
    await fetch("/api/notify/achievement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, title }),
    })
  } catch {
    // ponytail: notification is best-effort
  }
}

/** Award an achievement once per student. Issues certificate when definition requires it. */
export async function awardAchievement(
  db: SupabaseClient,
  studentId: string,
  slug: string,
  source?: string,
  definition?: EnsureDefinitionInput,
): Promise<AwardResult> {
  if (definition) {
    const id = await ensureDefinition(db, definition)
    if (!id) return { awarded: false }
  }

  const { data: row } = await db
    .from("achievement_definitions")
    .select("id, title, issues_certificate")
    .eq("slug", slug)
    .maybeSingle()
  if (!row?.id) return { awarded: false }

  const { data: existing } = await db
    .from("student_achievements")
    .select("id")
    .eq("student_id", studentId)
    .eq("achievement_id", row.id)
    .maybeSingle()
  if (existing?.id) return { awarded: false, achievementId: row.id }

  const { data: earned, error } = await db
    .from("student_achievements")
    .insert({
      student_id: studentId,
      achievement_id: row.id,
      earned_at: new Date().toISOString(),
      source: source ?? slug,
      metadata: {},
    })
    .select("id")
    .maybeSingle()

  if (error || !earned?.id) return { awarded: false }

  let certificateNumber: string | undefined
  if (row.issues_certificate) {
    const num = await issueCertificate(db, studentId, row.id, earned.id, slug)
    if (num) certificateNumber = num
  }

  void notifyTeachers(studentId, row.title)
  return { awarded: true, achievementId: row.id, certificateNumber }
}
