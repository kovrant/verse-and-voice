import { describe, expect, it } from "vitest"

import {
  calculateFitDimensions,
  downscaleImageFile,
  extractParaNumber,
  fileTypeOf,
  formatFileSize,
  isBulkMediaFile,
  safeUploadExtension,
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

describe("fileTypeOf / isBulkMediaFile / safeUploadExtension", () => {
  it("treats raster images and PDFs as bulk-eligible, rejecting SVG and other files", () => {
    expect(fileTypeOf({ type: "image/png", name: "a.png" })).toBe("image")
    expect(fileTypeOf({ type: "", name: "a.webp" })).toBe("image")
    expect(fileTypeOf({ type: "application/pdf", name: "a.pdf" })).toBe("pdf")
    expect(isBulkMediaFile({ type: "image/jpeg", name: "kids.jpg" })).toBe(true)
    expect(isBulkMediaFile({ type: "application/pdf", name: "para.pdf" })).toBe(true)
    expect(isBulkMediaFile({ type: "text/plain", name: "notes.txt" })).toBe(false)
    expect(isBulkMediaFile({ type: "image/svg+xml", name: "xss.svg" })).toBe(false)
  })

  it("whitelists safe storage extensions and falls back on dangerous extensions", () => {
    expect(safeUploadExtension("page.JPG")).toBe("jpg")
    expect(safeUploadExtension("para-1.PDF", "pdf")).toBe("pdf")
    expect(safeUploadExtension("xss.svg", "png")).toBe("png")
    expect(safeUploadExtension("exploit.html", "pdf")).toBe("pdf")
  })
})

describe("formatFileSize", () => {
  it("formats bytes, kilobytes, and megabytes cleanly", () => {
    expect(formatFileSize(0)).toBe("0 B")
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(153600)).toBe("150.0 KB")
    expect(formatFileSize(6291456)).toBe("6.0 MB")
  })
})

describe("calculateFitDimensions", () => {
  it("downscales 4K 16:9 images down to 1280x720 keeping aspect ratio", () => {
    const dims = calculateFitDimensions(3840, 2160, 1280, 720)
    expect(dims).toEqual({ width: 1280, height: 720 })
  })

  it("downscales square images to fit inside bounding box", () => {
    const dims = calculateFitDimensions(2000, 2000, 1280, 720)
    expect(dims).toEqual({ width: 720, height: 720 })
  })

  it("does not upscale images that are already smaller than target bounds", () => {
    const dims = calculateFitDimensions(800, 450, 1280, 720)
    expect(dims).toEqual({ width: 800, height: 450 })
  })

  it("handles non-positive dimensions gracefully", () => {
    expect(calculateFitDimensions(0, 0, 1280, 720)).toEqual({ width: 1280, height: 720 })
  })
})

describe("downscaleImageFile", () => {
  it("returns original file safely in non-browser/SSR environments", async () => {
    const fakeFile = new File(["dummy content"], "doc.pdf", { type: "application/pdf" })
    const res = await downscaleImageFile(fakeFile)
    expect(res.file).toBe(fakeFile)
    expect(res.originalSize).toBe(fakeFile.size)
  })
})

