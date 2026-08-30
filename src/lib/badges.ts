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
  const { data: badge } = await supabase.from("badges").select("id, title").eq("slug", slug).maybeSingle()
  if (!badge?.id) return false

  const { data: existing } = await supabase
    .from("student_badges")
    .select("id")
    .eq("student_id", studentId)
    .eq("badge_id", badge.id)
    .maybeSingle()
  if (existing?.id) return false

  const { error } = await supabase.from("student_badges").upsert(
    {
      student_id: studentId,
      badge_id: badge.id,
      earned_at: new Date().toISOString(),
      source: source ?? slug,
    },
    { onConflict: "student_id,badge_id", ignoreDuplicates: true },
  )

  if (!error) {
    void fetch("/api/notify/achievement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, title: badge.title }),
    })
  }

  return !error
}

export async function awardNamazCompleteBadge(studentId: string): Promise<boolean> {
  return awardBadge(studentId, NAMAZ_COMPLETE_BADGE_SLUG, "namaz_completion")
}
