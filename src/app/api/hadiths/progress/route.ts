import { NextResponse } from "next/server"

import { syncHadithMemorized } from "@/lib/achievements/sync"
import type { HadithStatus } from "@/lib/hadiths/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  let body: {
    student_id?: string
    hadith_id?: string
    status?: HadithStatus
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = body.student_id?.trim()
  const hadithId = body.hadith_id?.trim()
  const status = body.status

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

    const { data: updated, error } = await admin
      .from("student_hadith_progress")
      .update({
        status: newStatus,
        memorized_at: memorizedAt,
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

    const { data: inserted, error } = await admin
      .from("student_hadith_progress")
      .insert({
        student_id: studentId,
        hadith_id: hadithId,
        status: newStatus,
        memorized_at: memorizedAt,
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
  if (savedProgress?.status === "memorized") {
    await admin
      .from("hadith_assignments")
      .update({ status: "completed" })
      .eq("student_id", studentId)
      .eq("hadith_id", hadithId)
      .eq("status", "pending")
  }

  // 3. Count total memorized Hadiths for this student & award trophies/badges
  let newlyAwardedBadges: string[] = []
  const { count: memorizedCount } = await admin
    .from("student_hadith_progress")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "memorized")

  const totalMemorized = memorizedCount || 0

  if (savedProgress?.status === "memorized" && totalMemorized > 0) {
    newlyAwardedBadges = await syncHadithMemorized(admin, studentId, totalMemorized)
  }

  return NextResponse.json({
    success: true,
    progress: savedProgress,
    totalMemorized,
    newlyAwardedBadges,
  })
}
