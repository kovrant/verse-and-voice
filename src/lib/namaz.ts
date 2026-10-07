// Pure Namaz helpers — no Supabase import so they're unit-testable.

export interface NamazStep {
  id: string
  title: string
  order_index: number
  image_url: string | null
  card_color: string
}

export interface NamazStepPart {
  id: string
  step_id: string
  title: string
  order_index: number
  image_url: string | null
  /** The Arabic a child recites for this part (teacher-editable, may be empty). */
  arabic_text: string | null
  /** Its meaning in English, shown under the Arabic (teacher-editable, may be empty). */
  translation: string | null
  /** Short kid instruction: "Bow down. Hands on knees. Back flat." */
  action_text: string | null
  /** Transliteration, one entry per Arabic word (see `wordChips`). */
  word_tr: string[] | null
  /** "Say it 3 times". */
  repeat_count: number | null
  audio_url: string | null
  /** Start second of each word, same length as `word_tr`. */
  word_timings: number[] | null
  /** Generated content the teacher has not approved yet. */
  needs_review: boolean
  review_note: string | null
}

export const NAMAZ_STEP_SELECT = "id, title, order_index, image_url, card_color"
export const NAMAZ_PART_SELECT =
  "id, step_id, title, order_index, image_url, arabic_text, translation, action_text, word_tr, repeat_count, audio_url, word_timings, needs_review, review_note"

/** Preset swatches for the teacher step editor. */
export const NAMAZ_CARD_COLORS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#dc2626",
  "#0891b2",
  "#16a34a",
] as const

export function partsForStep(stepId: string, parts: NamazStepPart[]): NamazStepPart[] {
  return parts.filter((p) => p.step_id === stepId).sort((a, b) => a.order_index - b.order_index)
}

/** "Second Sujood" → "second-sujood", for `?step=` deep links. */
export function stepSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** One screen of the journey: a step and one of its parts (null when the step has none). */
export interface NamazStop {
  step: NamazStep
  part: NamazStepPart | null
  /** 0-based position of the step among all steps. */
  stepIndex: number
  /** 0-based position of the part inside its step. */
  partIndex: number
  partCount: number
}

/** Every part of every step, in prayer order, so Next can cross from one step to the next. */
export function flattenNamaz(steps: NamazStep[], parts: NamazStepPart[]): NamazStop[] {
  const ordered = [...steps].sort((a, b) => a.order_index - b.order_index)
  return ordered.flatMap((step, stepIndex): NamazStop[] => {
    const own = partsForStep(step.id, parts)
    if (own.length === 0) return [{ step, part: null, stepIndex, partIndex: 0, partCount: 1 }]
    return own.map((part, partIndex) => ({
      step,
      part,
      stepIndex,
      partIndex,
      partCount: own.length,
    }))
  })
}

/** Stable id of a screen: the part's id, or the step's when it has no parts. */
export function stopKey(stop: NamazStop): string {
  return stop.part?.id ?? stop.step.id
}

/** Index of `?step=ruku&part=2` (part is 1-based) in the journey, or -1. */
export function findStop(stops: NamazStop[], slug: string, part = 1): number {
  const first = stops.findIndex((s) => stepSlug(s.step.title) === slug)
  if (first === -1) return -1
  const within = Math.min(Math.max(part, 1), stops[first].partCount) - 1
  return first + within
}

export interface WordChip {
  ar: string
  tr: string
}

const AYAH_MARK = "۝"

/**
 * Pair the Arabic words with their transliteration. The Arabic is split on
 * spaces exactly as stored; an ayah marker (۝) rides on the word before it, so
 * joining every `ar` with a space gives back `arabic` unchanged. Returns null
 * when the counts disagree (e.g. a teacher edited the Arabic), and the caller
 * shows the plain Arabic instead.
 */
export function wordChips(arabic: string | null, tr: string[] | null): WordChip[] | null {
  if (!arabic || !tr?.length) return null
  const words: string[] = []
  for (const token of arabic.split(" ")) {
    if (token === AYAH_MARK && words.length > 0) words[words.length - 1] += ` ${token}`
    else words.push(token)
  }
  if (words.length !== tr.length) return null
  return words.map((ar, i) => ({ ar, tr: tr[i] }))
}

/** Start second of each word when the teacher hasn't timed them: spread evenly over the audio. */
export function evenWordTimings(count: number, duration: number): number[] {
  if (count <= 0 || !(duration > 0)) return []
  return Array.from({ length: count }, (_, i) => (duration * i) / count)
}

/** Index of the word playing at `time`, or -1 before the first one starts. */
export function activeWordIndex(timings: number[], time: number): number {
  let active = -1
  for (let i = 0; i < timings.length; i++) {
    if (timings[i] <= time) active = i
    else break
  }
  return active
}

export const NAMAZ_AUDIO_BUCKET = "namaz-audio"

/** Audio types the `namaz-audio` bucket accepts (migration_namaz_audio.sql), with the file extension to save. */
const NAMAZ_AUDIO_TYPES: Record<string, string> = {
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
export function namazAudioType(mime: string, fileName = ""): { type: string; ext: string } | null {
  let type = mime.split(";")[0].trim().toLowerCase()
  if (!NAMAZ_AUDIO_TYPES[type]) {
    const ext = fileName.split(".").pop()?.toLowerCase()
    type = Object.keys(NAMAZ_AUDIO_TYPES).find((t) => NAMAZ_AUDIO_TYPES[t] === ext) ?? ""
  }
  return NAMAZ_AUDIO_TYPES[type] ? { type, ext: NAMAZ_AUDIO_TYPES[type] } : null
}

/** Object path inside the namaz-audio bucket for a stored public URL, or null for any other URL. */
export function namazAudioPath(url: string | null): string | null {
  const marker = `/${NAMAZ_AUDIO_BUCKET}/`
  const i = url?.indexOf(marker) ?? -1
  return url && i !== -1 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null
}

/** Word timings a teacher tapped are usable: one per word, never going backwards. */
export function validWordTimings(timings: number[] | null, wordCount: number): boolean {
  if (!timings || wordCount === 0 || timings.length !== wordCount) return false
  return timings.every((t, i) => t >= 0 && (i === 0 || t >= timings[i - 1]))
}
