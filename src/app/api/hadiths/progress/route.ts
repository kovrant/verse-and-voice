import { NextResponse } from "next/server"

import { awardAchievement } from "@/lib/achievements/award"
import { getEligibleHadithBadgeSlugs } from "@/lib/hadiths/hadith-engine"
import { HADITH_BADGE_SLUGS, type HadithStatus } from "@/lib/hadiths/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

const HADITH_BADGE_DEFINITIONS: Record<
  string,
  { slug: string; title: string; description: string; domain: "hadith"; kind: "badge"; issuesCertificate: boolean }
> = {
  [HADITH_BADGE_SLUGS.EXPLORER]: {
    slug: HADITH_BADGE_SLUGS.EXPLORER,
    title: "Hadith Explorer",
    description: "Memorized 5 precious Hadiths of Prophet Muhammad (ﷺ)",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.CHAMPION]: {
    slug: HADITH_BADGE_SLUGS.CHAMPION,
    title: "Sunnah Champion",
    description: "Memorized 15 Hadiths with their moral lessons and translations",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
  [HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR]: {
    slug: HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR,
    title: "Arba'in Scholar (40 Hadith Master)",
    description: "Completed the noble milestone of memorizing 40 Short Hadiths for Kids",
    domain: "hadith",
    kind: "badge",
    issuesCertificate: false,
  },
}

export async function POST(request: Request) {
  let body: {
    student_id?: string
    hadith_id?: string
    status?: HadithStatus
    increment_practice?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = body.student_id?.trim()
  const hadithId = body.hadith_id?.trim()
  const status = body.status
  const incrementPractice = !!body.increment_practice

  if (!studentId || !hadithId) {
    return NextResponse.json({ error: "student_id and hadith_id are required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch current progress
  const { data: existingProgress } = await admin
    .from("student_hadith_progress")
    .select("*")
    .eq("student_id", studentId)
    .eq("hadith_id", hadithId)
    .maybeSingle()

  const now = new Date().toISOString()
  let savedProgress

  if (existingProgress) {
    const newStatus = status || existingProgress.status
    const memorizedAt =
      newStatus === "memorized"
        ? existingProgress.memorized_at || now
        : existingProgress.memorized_at

    const practiceCount = incrementPractice
      ? (existingProgress.practice_count || 0) + 1
      : existingProgress.practice_count || 0

    const { data: updated, error } = await admin
      .from("student_hadith_progress")
      .update({
        status: newStatus,
        memorized_at: memorizedAt,
        practice_count: practiceCount,
        updated_at: now,
      })
      .eq("id", existingProgress.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("Error updating hadith progress:", error)
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
    }
    savedProgress = updated
  } else {
    const newStatus = status || "reading"
    const memorizedAt = newStatus === "memorized" ? now : null
    const practiceCount = incrementPractice ? 1 : 0

    const { data: inserted, error } = await admin
      .from("student_hadith_progress")
      .insert({
        student_id: studentId,
        hadith_id: hadithId,
        status: newStatus,
        memorized_at: memorizedAt,
        practice_count: practiceCount,
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error("Error inserting hadith progress:", error)
      return NextResponse.json({ error: "Failed to create progress" }, { status: 500 })
    }
    savedProgress = inserted
  }

  // 2. Check if this hadith assignment exists and mark completed if memorized
  if (savedProgress.status === "memorized") {
    await admin
      .from("hadith_assignments")
      .update({ completed_at: now })
      .eq("student_id", studentId)
      .eq("hadith_id", hadithId)
      .is("completed_at", null)
  }

  // 3. Count total memorized Hadiths for this student & check milestone badges
  const { count: memorizedCount } = await admin
    .from("student_hadith_progress")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "memorized")

  const totalMemorized = memorizedCount || 0
  const eligibleSlugs = getEligibleHadithBadgeSlugs(totalMemorized)
  const newlyAwardedBadges: string[] = []

  for (const slug of eligibleSlugs) {
    const def = HADITH_BADGE_DEFINITIONS[slug]
    if (!def) continue

    const res = await awardAchievement(admin, studentId, slug, "hadith", def)
    if (res.awarded) {
      newlyAwardedBadges.push(def.title)
    }
  }

  return NextResponse.json({
    success: true,
    progress: savedProgress,
    totalMemorized,
    newlyAwardedBadges,
  })
}
