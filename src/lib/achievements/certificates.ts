import type { SupabaseClient } from "@supabase/supabase-js"

/** Generate a human-readable certificate number. ponytail: not cryptographically unique — upgrade to DB sequence if collisions matter. */
export function buildCertificateNumber(studentId: string, slug: string): string {
  const year = new Date().getFullYear()
  const tail = studentId.replace(/-/g, "").slice(0, 6).toUpperCase()
  const slugPart = slug.replace(/[^a-z0-9]+/gi, "-").slice(0, 12).toUpperCase()
  return `VV-${year}-${slugPart}-${tail}`
}

export async function issueCertificate(
  db: SupabaseClient,
  studentId: string,
  achievementId: string,
  studentAchievementId: string | null,
  slug: string,
): Promise<string | null> {
  const { data: existing } = await db
    .from("student_certificates")
    .select("certificate_number")
    .eq("student_id", studentId)
    .eq("achievement_id", achievementId)
    .maybeSingle()
  if (existing?.certificate_number) return existing.certificate_number

  const certificateNumber = buildCertificateNumber(studentId, slug)
  const { error } = await db.from("student_certificates").insert({
    student_id: studentId,
    achievement_id: achievementId,
    student_achievement_id: studentAchievementId,
    certificate_number: certificateNumber,
    metadata: { slug },
  })

  return error ? null : certificateNumber
}
