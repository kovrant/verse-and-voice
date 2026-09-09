import { describe, expect, it, vi } from "vitest"

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}))

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}))

import { loadLastPage, saveLastPage } from "./para-progress"

describe("para-progress", () => {
  it("loadLastPage returns 1 when no row is found", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
          }),
        }),
      }),
    })

    const page = await loadLastPage("s1", 1)
    expect(page).toBe(1)
  })

  it("loadLastPage returns the saved page number", async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { last_page: 7 } }),
          }),
        }),
      }),
    })

    const page = await loadLastPage("s1", 2)
    expect(page).toBe(7)
  })

  it("saveLastPage inserts when row does not exist", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      })

    await saveLastPage("s1", 2, 7)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "s1",
        para_number: 2,
        last_page: 7,
      }),
    )
  })

  it("saveLastPage updates when row already exists", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

    mockSupabase.from
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "p1" } }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: mockUpdate,
      })

    await saveLastPage("s1", 2, 8)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        last_page: 8,
      }),
    )
    expect(mockEq).toHaveBeenCalledWith("id", "p1")
  })
})
