import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}))

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}))

import { loadBookmark, loadLastPage, saveBookmark, saveLastPage } from "./para-progress"

describe("para-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear()
    }
  })

  it("loadBookmark returns page 1 and undefined coords when no row is found", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    })

    const bm = await loadBookmark("s1", 1)
    expect(bm.page).toBe(1)
    expect(bm.line).toBeUndefined()
  })

  it("loadBookmark returns the saved page and bookmark line/coordinates", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                last_page: 5,
                last_line: 7,
                last_pointer_x: 0.45,
                last_pointer_y: 0.52,
                updated_at: "2026-09-14T20:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    const bm = await loadBookmark("s1", 2)
    expect(bm.page).toBe(5)
    expect(bm.line).toBe(7)
    expect(bm.x).toBe(0.45)
    expect(bm.y).toBe(0.52)
  })

  it("loadLastPage returns the saved page number", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { last_page: 7, last_line: null },
              error: null,
            }),
          }),
        }),
      }),
    })

    const page = await loadLastPage("s1", 2)
    expect(page).toBe(7)
  })

  it("saveBookmark inserts when row does not exist", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      })

    await saveBookmark("s1", 2, { page: 7, line: 4, x: 0.25, y: 0.31 })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "s1",
        para_number: 2,
        last_page: 7,
        last_line: 4,
        last_pointer_x: 0.25,
        last_pointer_y: 0.31,
      }),
    )
  })

  it("saveBookmark updates when row already exists", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

    mockSupabase.from
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "p1" }, error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: mockUpdate,
      })

    await saveBookmark("s1", 2, { page: 8, line: 12, x: 0.6, y: 0.8 })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        last_page: 8,
        last_line: 12,
        last_pointer_x: 0.6,
        last_pointer_y: 0.8,
      }),
    )
    expect(mockEq).toHaveBeenCalledWith("id", "p1")
  })
})

