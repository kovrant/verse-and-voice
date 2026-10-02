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
export function safeUploadExtension(
  filename: string,
  fallback: "png" | "pdf" | "webp" = "png",
): string {
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

export interface DownscaleImageOptions {
  maxWidth?: number // default 1280
  maxHeight?: number // default 720
  quality?: number // default 0.82
  targetMimeType?: "image/webp" | "image/jpeg"
}

export interface DownscaleImageResult {
  file: File
  width: number
  height: number
  originalSize: number
  optimizedSize: number
  savingsPercent: number
  format: string
}

/** Formats byte counts for human-friendly display (e.g. 5.4 MB, 142 KB). */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Calculates new dimensions scaled to fit within maxWidth and maxHeight
 * while strictly preserving the original aspect ratio without distortion.
 */
export function calculateFitDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth = 1280,
  maxHeight = 720,
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: Math.max(1, maxWidth), height: Math.max(1, maxHeight) }
  }
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1)
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  }
}

/**
 * Downscales an image File using an offscreen HTML5 canvas to reduce resolution
 * and compress file size (e.g. from 8 MB 4K Canva export to ~100 KB WebP).
 *
 * Safe to call on any File; if the file is not an image or if canvas is not
 * available (SSR/Node), returns the original File unchanged.
 */
export async function downscaleImageFile(
  file: File,
  options: DownscaleImageOptions = {},
): Promise<DownscaleImageResult> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.82,
    targetMimeType = "image/webp",
  } = options

  // If not an image or in SSR environment, return original
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      optimizedSize: file.size,
      savingsPercent: 0,
      format: file.type || "unknown",
    }
  }

  // Animated GIFs: avoid flattening to single frame
  if (file.type === "image/gif") {
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      optimizedSize: file.size,
      savingsPercent: 0,
      format: "image/gif",
    }
  }

  return new Promise<DownscaleImageResult>((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl)
      } catch {
        // ignore
      }
    }

    img.onload = () => {
      try {
        const { width, height } = calculateFitDimensions(
          img.naturalWidth,
          img.naturalHeight,
          maxWidth,
          maxHeight,
        )

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          cleanup()
          resolve({
            file,
            width: img.naturalWidth,
            height: img.naturalHeight,
            originalSize: file.size,
            optimizedSize: file.size,
            savingsPercent: 0,
            format: file.type,
          })
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        const preferredType =
          targetMimeType === "image/webp" &&
          typeof canvas.toDataURL === "function" &&
          canvas.toDataURL("image/webp").startsWith("data:image/webp")
            ? "image/webp"
            : "image/jpeg"

        canvas.toBlob(
          (blob) => {
            cleanup()
            if (!blob) {
              resolve({
                file,
                width: img.naturalWidth,
                height: img.naturalHeight,
                originalSize: file.size,
                optimizedSize: file.size,
                savingsPercent: 0,
                format: file.type,
              })
              return
            }

            const ext = preferredType === "image/webp" ? "webp" : "jpg"
            const baseName = file.name.replace(/\.[^.]+$/, "")
            const newName = `${baseName}.${ext}`
            const optimizedFile = new File([blob], newName, {
              type: preferredType,
              lastModified: Date.now(),
            })

            const savingsPercent =
              file.size > 0
                ? Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100))
                : 0

            resolve({
              file: optimizedFile,
              width,
              height,
              originalSize: file.size,
              optimizedSize: blob.size,
              savingsPercent,
              format: preferredType,
            })
          },
          preferredType,
          quality,
        )
      } catch {
        cleanup()
        resolve({
          file,
          width: 0,
          height: 0,
          originalSize: file.size,
          optimizedSize: file.size,
          savingsPercent: 0,
          format: file.type,
        })
      }
    }

    img.onerror = () => {
      cleanup()
      resolve({
        file,
        width: 0,
        height: 0,
        originalSize: file.size,
        optimizedSize: file.size,
        savingsPercent: 0,
        format: file.type,
      })
    }

    img.src = objectUrl
  })
}

