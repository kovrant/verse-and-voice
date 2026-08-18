import { describe, expect, it } from "vitest"

import {
  extractParaNumber,
  fileTypeOf,
  isBulkMediaFile,
  storagePathFromPublicUrl,
  titleFromFilename,
} from "./media-upload"

describe("extractParaNumber", () => {
  it("reads para labels and leading numbers, ignores out-of-range", () => {
    expect(extractParaNumber("Para 1.pdf")).toBe(1)
    expect(extractParaNumber("para-01.pdf")).toBe(1)
    expect(extractParaNumber("30 para.pdf")).toBe(30)
    expect(extractParaNumber("12.pdf")).toBe(12)
    expect(extractParaNumber("31.pdf")).toBeNull()
    expect(extractParaNumber("notes.pdf")).toBeNull()
  })
})

describe("titleFromFilename", () => {
  it("strips the extension and title-cases separators", () => {
    expect(titleFromFilename("surah-fatiha.png")).toBe("Surah Fatiha")
    expect(titleFromFilename("dua_qunoot.jpg")).toBe("Dua Qunoot")
  })
})

describe("storagePathFromPublicUrl", () => {
  it("pulls the object path out of a public media URL", () => {
    expect(
      storagePathFromPublicUrl(
        "https://x.supabase.co/storage/v1/object/public/media/memorization/a.png",
      ),
    ).toBe("memorization/a.png")
    expect(
      storagePathFromPublicUrl(
        "https://x.supabase.co/storage/v1/object/public/media/quran/Para%201.pdf",
      ),
    ).toBe("quran/Para 1.pdf")
  })
})

describe("fileTypeOf / isBulkMediaFile", () => {
  it("treats images and PDFs as bulk-eligible, not other files", () => {
    expect(fileTypeOf({ type: "image/png", name: "a.png" })).toBe("image")
    expect(fileTypeOf({ type: "", name: "a.webp" })).toBe("image")
    expect(fileTypeOf({ type: "application/pdf", name: "a.pdf" })).toBe("pdf")
    expect(isBulkMediaFile({ type: "image/jpeg", name: "kids.jpg" })).toBe(true)
    expect(isBulkMediaFile({ type: "application/pdf", name: "para.pdf" })).toBe(true)
    expect(isBulkMediaFile({ type: "text/plain", name: "notes.txt" })).toBe(false)
  })
})
