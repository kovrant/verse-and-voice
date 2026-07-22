import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * Fetch every row from a table, paging past PostgREST's default 1000-row cap.
 * Pass a builder that applies select/eq/order, given a fresh base query each page.
 * Without this, large unfiltered selects silently drop rows beyond the cap.
 *
 * Example:
 *   const rows = await fetchAllRows("quran_rounds", (q) =>
 *     q.select("*").order("round_number", { ascending: true }))
 */
export async function fetchAllRows<T = any>(
  table: string,
  build: (query: any) => any,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  // Loop until a short page signals we've reached the end.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await build(supabase.from(table)).range(from, from + pageSize - 1)
    if (error) throw error
    const batch = (data as T[]) || []
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return all
}
