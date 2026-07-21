import { supabase } from "@/lib/supabase"

/**
 * Per-(student, para) page position, stored in student_para_progress. Uses
 * read-modify-write (no unique constraint required) — page turns are debounced,
 * so the extra read is cheap and races are benign (last write wins).
 */

export async function loadLastPage(studentId: string, paraNumber: number): Promise<number> {
  const { data } = await supabase
    .from("student_para_progress")
    .select("last_page")
    .eq("student_id", studentId)
    .eq("para_number", paraNumber)
    .maybeSingle()
  const p = data?.last_page
  return typeof p === "number" && p > 0 ? p : 1
}

export async function saveLastPage(
  studentId: string,
  paraNumber: number,
  page: number,
  totalPages?: number
): Promise<void> {
  const { data } = await supabase
    .from("student_para_progress")
    .select("id")
    .eq("student_id", studentId)
    .eq("para_number", paraNumber)
    .maybeSingle()

  const patch: Record<string, unknown> = { last_page: page, updated_at: new Date().toISOString() }
  if (typeof totalPages === "number" && totalPages > 0) patch.total_pages = totalPages

  if (data?.id) {
    await supabase.from("student_para_progress").update(patch).eq("id", data.id)
  } else {
    await supabase
      .from("student_para_progress")
      .insert({ student_id: studentId, para_number: paraNumber, ...patch })
  }
}
