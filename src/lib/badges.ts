import { NAMAZ_COMPLETE_BADGE_SLUG } from "@/lib/namaz"
import { supabase } from "@/lib/supabase"

/** Insert a catalog row when slug is dynamic (memorization, repeat khatms). */
export async function ensureBadge(
  slug: string,
  title: string,
  description?: string,
): Promise<string | null> {
  const { data: existing } = await supabase.from("badges").select("id").eq("slug", slug).maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from("badges")
    .insert({ slug, title, description: description ?? title })
    .select("id")
    .maybeSingle()

  if (error || !created?.id) return null
  return created.id
}

/** Award a badge once per student. Returns false if badge slug unknown or already earned. */
export async function awardBadge(
  studentId: string,
  slug: string,
  source?: string,
): Promise<boolean> {
  let badgeId = (await supabase.from("badges").select("id").eq("slug", slug).maybeSingle()).data?.id
  if (!badgeId) return false

  const { error } = await supabase.from("student_badges").upsert(
    {
      student_id: studentId,
      badge_id: badgeId,
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
