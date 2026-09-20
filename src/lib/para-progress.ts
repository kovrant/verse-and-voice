import { supabase } from "@/lib/supabase"

export interface ParaBookmark {
  page: number
  line?: number | null
  x?: number | null
  y?: number | null
  updatedAt?: string
}

function getLocalBookmarkKey(studentId: string, paraNumber: number): string {
  return `quran_academy_bm_${studentId}_p${paraNumber}`
}

function readLocalBookmark(studentId: string, paraNumber: number): ParaBookmark | null {
  if (typeof window === "undefined" || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(getLocalBookmarkKey(studentId, paraNumber))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ParaBookmark
    if (typeof parsed?.page === "number" && parsed.page > 0) {
      return parsed
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return null
}

function writeLocalBookmark(studentId: string, paraNumber: number, bookmark: ParaBookmark): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(
      getLocalBookmarkKey(studentId, paraNumber),
      JSON.stringify(bookmark),
    )
  } catch {
    // Ignore localStorage quota / access errors
  }
}

/**
 * Load saved page and bookmark (line + coordinates) for a student and para.
 * Checks Supabase student_para_progress, with localStorage fallback.
 */
export async function loadBookmark(studentId: string, paraNumber: number): Promise<ParaBookmark> {
  try {
    const { data, error } = await supabase
      .from("student_para_progress")
      .select("last_page, last_line, last_pointer_x, last_pointer_y, updated_at")
      .eq("student_id", studentId)
      .eq("para_number", paraNumber)
      .maybeSingle()

    if (!error && data) {
      const page = typeof data.last_page === "number" && data.last_page > 0 ? data.last_page : 1
      const bookmark: ParaBookmark = {
        page,
        line: typeof data.last_line === "number" ? data.last_line : undefined,
        x: typeof data.last_pointer_x === "number" ? data.last_pointer_x : undefined,
        y: typeof data.last_pointer_y === "number" ? data.last_pointer_y : undefined,
        updatedAt: data.updated_at,
      }
      writeLocalBookmark(studentId, paraNumber, bookmark)
      return bookmark
    }
  } catch {
    // Fall back to local storage below
  }

  const local = readLocalBookmark(studentId, paraNumber)
  if (local) return local

  return { page: 1 }
}

/**
 * Save page and bookmark (line + coordinates) for a student and para.
 * Persists to localStorage immediately and Supabase student_para_progress.
 */
export async function saveBookmark(
  studentId: string,
  paraNumber: number,
  bookmark: ParaBookmark,
  totalPages?: number,
): Promise<void> {
  const timestamp = bookmark.updatedAt || new Date().toISOString()
  const bm: ParaBookmark = { ...bookmark, updatedAt: timestamp }
  writeLocalBookmark(studentId, paraNumber, bm)

  const patch: Record<string, unknown> = {
    last_page: bookmark.page,
    last_line: typeof bookmark.line === "number" ? bookmark.line : null,
    last_pointer_x: typeof bookmark.x === "number" ? bookmark.x : null,
    last_pointer_y: typeof bookmark.y === "number" ? bookmark.y : null,
    updated_at: timestamp,
  }
  if (typeof totalPages === "number" && totalPages > 0) patch.total_pages = totalPages

  try {
    const { data } = await supabase
      .from("student_para_progress")
      .select("id")
      .eq("student_id", studentId)
      .eq("para_number", paraNumber)
      .maybeSingle()

    if (data?.id) {
      const res = await supabase.from("student_para_progress").update(patch).eq("id", data.id)
      if (res.error) throw res.error
    } else {
      const res = await supabase
        .from("student_para_progress")
        .insert({ student_id: studentId, para_number: paraNumber, ...patch })
      if (res.error) throw res.error
    }
  } catch {
    // Graceful fallback: If bookmark columns are missing in DB schema, attempt saving last_page only
    try {
      const minimalPatch: Record<string, unknown> = {
        last_page: bookmark.page,
        updated_at: timestamp,
      }
      if (typeof totalPages === "number" && totalPages > 0) minimalPatch.total_pages = totalPages

      const { data } = await supabase
        .from("student_para_progress")
        .select("id")
        .eq("student_id", studentId)
        .eq("para_number", paraNumber)
        .maybeSingle()

      if (data?.id) {
        await supabase.from("student_para_progress").update(minimalPatch).eq("id", data.id)
      } else {
        await supabase
          .from("student_para_progress")
          .insert({ student_id: studentId, para_number: paraNumber, ...minimalPatch })
      }
    } catch {
      // Best-effort DB write — local storage already cached the bookmark
    }
  }
}

/**
 * Backward-compatible page loaders
 */
export async function loadLastPage(studentId: string, paraNumber: number): Promise<number> {
  const bm = await loadBookmark(studentId, paraNumber)
  return bm.page
}

/**
 * Update the reading page WITHOUT touching a stored bookmark.
 *
 * Page turns used to be saved as "page X, no bookmark", which wiped the line the
 * teacher had marked, so the next class had nothing to show. A bookmark now
 * survives until the teacher sets a new one or clears it: while one exists this
 * is a no-op, so the class resumes exactly where the bookmark is.
 */
export async function savePageKeepingBookmark(
  studentId: string,
  paraNumber: number,
  page: number,
  totalPages?: number,
): Promise<void> {
  const existing = await loadBookmark(studentId, paraNumber)
  if (typeof existing.line === "number") return

  await saveBookmark(studentId, paraNumber, { page }, totalPages)
}

export async function saveLastPage(
  studentId: string,
  paraNumber: number,
  page: number,
  totalPages?: number,
): Promise<void> {
  // Preserve existing bookmark line/coords if any when only turning the page
  const local = readLocalBookmark(studentId, paraNumber)
  await saveBookmark(
    studentId,
    paraNumber,
    {
      page,
      line: local?.page === page ? local.line : undefined,
      x: local?.page === page ? local.x : undefined,
      y: local?.page === page ? local.y : undefined,
    },
    totalPages,
  )
}
