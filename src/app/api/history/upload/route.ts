import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { safeUploadExtension } from "@/lib/media-upload"
import { CACHE_FOREVER } from "@/lib/storage"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const ALLOWED_FOLDERS = new Set(["covers", "documents"])

export async function POST(req: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const requestedFolder = ((formData.get("folder") as string) || "covers").toLowerCase().trim()

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No valid file uploaded" }, { status: 400 })
    }

    const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : "covers"
    const fallbackExt = file.type.startsWith("image/") ? "webp" : "pdf"
    const ext = safeUploadExtension(file.name, fallbackExt)
    const randomSuffix = Math.random().toString(36).slice(2, 9)
    const objectName = `${Date.now()}-${randomSuffix}.${ext}`
    const targetPath = `${folder}/${objectName}`

    const admin = createSupabaseAdminClient()

    // 1. Ensure primary bucket exists and is public
    try {
      const { data: buckets } = await admin.storage.listBuckets()
      const exists = buckets?.some((b) => b.id === "history-attachments")
      if (!exists) {
        await admin.storage.createBucket("history-attachments", {
          public: true,
          fileSizeLimit: 20971520, // 20 MB
        })
      }
    } catch (bucketCheckErr) {
      console.warn("Storage bucket auto-check warning:", bucketCheckErr)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || (ext === "webp" ? "image/webp" : "application/octet-stream")

    // 2. Upload to history-attachments
    let bucketUsed = "history-attachments"
    let uploadedPath = targetPath
    const { error: primaryError } = await admin.storage
      .from("history-attachments")
      .upload(targetPath, buffer, {
        contentType,
        cacheControl: CACHE_FOREVER,
        upsert: false,
      })

    // 3. Fallback to 'media' bucket if primary fails
    if (primaryError) {
      console.warn(
        `Failed uploading to history-attachments (${primaryError.message}), attempting fallback to media bucket...`,
      )
      bucketUsed = "media"
      uploadedPath = `history/${targetPath}`
      const { error: fallbackError } = await admin.storage
        .from("media")
        .upload(uploadedPath, buffer, {
          contentType,
          cacheControl: CACHE_FOREVER,
          upsert: false,
        })

      if (fallbackError) {
        console.error("Storage upload failed on both buckets:", {
          primaryError,
          fallbackError,
        })
        return NextResponse.json(
          {
            error: `Storage upload failed: ${primaryError.message} (Fallback: ${fallbackError.message})`,
          },
          { status: 500 },
        )
      }
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(bucketUsed).getPublicUrl(uploadedPath)

    return NextResponse.json({
      url: publicUrl,
      bucket: bucketUsed,
      folder,
      path: uploadedPath,
      size: buffer.length,
    })
  } catch (err) {
    console.error("Unexpected error in history upload route:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
