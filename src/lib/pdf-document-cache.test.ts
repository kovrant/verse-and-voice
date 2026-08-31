import { describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }),
)

vi.stubGlobal("fetch", fetchMock)

import { loadPdfBytes, prefetchPdf } from "./pdf-document-cache"

describe("pdf-document-cache", () => {
  it("dedupes downloads but returns independent buffer copies", async () => {
    prefetchPdf("https://example.com/a.pdf")
    const [a, b] = await Promise.all([
      loadPdfBytes("https://example.com/a.pdf"),
      loadPdfBytes("https://example.com/a.pdf"),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).not.toBe(b)
    expect(a.byteLength).toBe(8)
  })

  it("ignores empty prefetch URLs", () => {
    expect(() => prefetchPdf("")).not.toThrow()
    expect(() => prefetchPdf(undefined)).not.toThrow()
  })
})
