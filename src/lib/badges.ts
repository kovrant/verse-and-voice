import { NAMAZ_COMPLETE_BADGE_SLUG } from "@/lib/namaz"
import { supabase } from "@/lib/supabase"

/** Award a badge once per student. Returns false if badge slug unknown or already earned. */
export async function awardBadge(
  studentId: string,
  slug: string,
  source?: string,
): Promise<boolean> {
  const { data: badge } = await supabase.from("badges").select("id").eq("slug", slug).maybeSingle()
  if (!badge?.id) return false

  const { error } = await supabase.from("student_badges").upsert(
    {
      student_id: studentId,
      badge_id: badge.id,
      earned_at: new Date().toISOString(),
      source: source ?? slug,
    },
    { onConflict: "student_id,badge_id", ignoreDuplicates: true },
  )

  return !error
}

export async function awardNamazCompleteBadge(studentId: string): Promise<boolean> {
  return awardBadge(studentId, NAMAZ_COMPLETE_BADGE_SLUG, "namaz_completion")
}
