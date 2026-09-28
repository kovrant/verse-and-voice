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

const SAFE_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/bmp",
])

const SAFE_IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i

const SAFE_UPLOAD_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "pdf",
])

export function fileTypeOf(file: { type: string; name: string }): "image" | "pdf" {
  const mime = file.type.toLowerCase()
  // Explicitly exclude SVG (`image/svg+xml`) since SVG documents can execute inline <script>.
  if (
    mime !== "image/svg+xml" &&
    !/\.svgz?$/i.test(file.name) &&
    (SAFE_IMAGE_MIME_TYPES.has(mime) || SAFE_IMAGE_EXT_PATTERN.test(file.name))
  ) {
    return "image"
  }
  return "pdf"
}

export function isBulkMediaFile(file: { type: string; name: string }): boolean {
  return (
    fileTypeOf(file) === "image" ||
    file.type.toLowerCase() === "application/pdf" ||
    /\.pdf$/i.test(file.name)
  )
}

/**
 * Returns a lowercase file extension strictly from the safe upload whitelist
 * (`png`, `jpg`, `jpeg`, `gif`, `webp`, `heic`, `heif`, `bmp`, `pdf`), preventing
 * executable extensions (`.svg`, `.html`, `.js`) in public storage object keys.
 */
export function safeUploadExtension(filename: string, fallback: "png" | "pdf" = "png"): string {
  const raw = filename.split(".").pop()?.toLowerCase().trim() ?? ""
  return SAFE_UPLOAD_EXTENSIONS.has(raw) ? raw : fallback
}

/** Object path inside the `media` bucket from a public storage URL. */
export function storagePathFromPublicUrl(url: string, bucket = "media"): string | null {
  const marker = `/object/public/${bucket}/`
  const i = url.indexOf(marker)
  const raw = i >= 0 ? url.slice(i + marker.length) : url.split(`/${bucket}/`).slice(1).join(`/${bucket}/`)
  const path = decodeURIComponent(raw.split("?")[0] ?? "")
  return path || null
}
