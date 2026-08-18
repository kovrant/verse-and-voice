/** Filename → 1–30 para number, or null. Used by Quran bulk upload. */
export function extractParaNumber(filename: string): number | null {
  const match =
    filename.match(/(?:para[\s_-]*)(\d+)/i) ||
    filename.match(/(\d+)[\s_-]*para/i) ||
    filename.match(/^(\d+)\./i)
  if (!match) return null
  const num = parseInt(match[1], 10)
  return num >= 1 && num <= 30 ? num : null
}

/** `surah-fatiha.png` → `Surah Fatiha`. */
export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  if (!base) return name
  return base.replace(/\b[\p{L}\p{N}]/gu, (c) => c.toUpperCase())
}

export function fileTypeOf(file: { type: string; name: string }): "image" | "pdf" {
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(file.name)) {
    return "image"
  }
  return "pdf"
}

export function isBulkMediaFile(file: { type: string; name: string }): boolean {
  return fileTypeOf(file) === "image" || file.type === "application/pdf" || /\.pdf$/i.test(file.name)
}

/** Object path inside the `media` bucket from a public storage URL. */
export function storagePathFromPublicUrl(url: string, bucket = "media"): string | null {
  const marker = `/object/public/${bucket}/`
  const i = url.indexOf(marker)
  const raw = i >= 0 ? url.slice(i + marker.length) : url.split(`/${bucket}/`).slice(1).join(`/${bucket}/`)
  const path = decodeURIComponent(raw.split("?")[0] ?? "")
  return path || null
}
