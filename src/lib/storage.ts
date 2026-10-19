/**
 * Supabase Storage upload settings.
 *
 * Every upload path in this app names its object with a random suffix
 * (`${Date.now()}-${Math.random()...}.ext`), so a given URL's bytes never
 * change. That makes the content immutable, and it should be cached for as
 * long as the browser will hold it: at `max-age=3600` a student re-downloaded
 * their ~8 MB para PDF at every single class, which was most of the project's
 * egress.
 *
 * The rule that keeps this safe: never overwrite an existing path. Upload
 * under a new random name and update the URL in the database instead.
 */
export const CACHE_FOREVER = "31536000" // one year, the max browsers honour

/**
 * Audio types the teacher-recording buckets accept (`namaz-audio`, `qaida-audio`;
 * see their migrations' `allowed_mime_types`), with the file extension to save.
 */
const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
}

/**
 * Bucket-safe content type and extension for a recording or uploaded file, or
 * null if the bucket would refuse it. Drops `;codecs=…` (MediaRecorder adds
 * it) and falls back to the file extension when the browser gives no type.
 */
export function audioUploadType(mime: string, fileName = ""): { type: string; ext: string } | null {
  let type = mime.split(";")[0].trim().toLowerCase()
  if (!AUDIO_TYPES[type]) {
    const ext = fileName.split(".").pop()?.toLowerCase()
    type = Object.keys(AUDIO_TYPES).find((t) => AUDIO_TYPES[t] === ext) ?? ""
  }
  return AUDIO_TYPES[type] ? { type, ext: AUDIO_TYPES[type] } : null
}

/** Object path inside `bucket` for a stored public URL, or null for any other URL. */
export function bucketObjectPath(bucket: string, url: string | null): string | null {
  const marker = `/${bucket}/`
  const i = url?.indexOf(marker) ?? -1
  return url && i !== -1 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null
}
