// Pure helpers for the Qaida course that sit between the content module and the
// database. No Supabase import so they're unit-testable.
import { allCards, type Card, type ExerciseItem } from "@/content/qaida"
import { bucketObjectPath } from "@/lib/storage"

export const QAIDA_AUDIO_BUCKET = "qaida-audio"

/** A row of `qaida_audio` (migration_qaida_course.sql). */
export interface QaidaAudioRow {
  audio_key: string
  audio_url: string
  recorded_at: string
}
export const QAIDA_AUDIO_SELECT = "audio_key, audio_url, recorded_at"

/** Object path inside the qaida-audio bucket for a stored public URL, or null for any other URL. */
export const qaidaAudioPath = (url: string | null) => bucketObjectPath(QAIDA_AUDIO_BUCKET, url)

/** Storage object name for a new clip: the key with `/` → `-`, a timestamp so it is never overwritten. */
export const qaidaAudioObjectName = (audioKey: string, ext: string, now = Date.now()) =>
  `${audioKey.replace(/[^a-z0-9]+/gi, "-")}-${now.toString(36)}.${ext}`

/**
 * One clip the teacher can record. Several cards share a key (the syllable card بَ,
 * the fatha drill grid and the listen exercise all play `syl/ba-a`), so the
 * recording list is built from keys, not cards.
 */
export interface AudioKey {
  key: string
  /** `letters` | `syl` | `words` | `quran`, from the key's prefix. */
  group: string
  arabic: string
  translit: string
  /** First unit that uses the clip; the recording list is sorted by this. */
  unit: number
  /** Ids of the cards that play it. */
  cardIds: string[]
}

const unitOf = (cardId: string) => Number(cardId.slice(1, cardId.indexOf(".")))
const isArabic = (s: string | undefined): s is string => !!s && /[؀-ۿ]/.test(s)

function itemArabic(item: ExerciseItem): string {
  if (item.arabic) return item.arabic
  if (typeof item.answer === "string" && isArabic(item.answer)) return item.answer
  if (item.shown) return item.shown.join(" ")
  return ""
}

/** Every audio key in the course, in teaching order, with what to show while recording it. */
export function collectAudioKeys(cards: Card[] = allCards()): AudioKey[] {
  const byKey = new Map<string, AudioKey>()
  const add = (key: string, cardId: string, arabic: string, translit: string) => {
    const existing = byKey.get(key)
    if (existing) {
      if (!existing.arabic && arabic) existing.arabic = arabic
      if (!existing.translit && translit) existing.translit = translit
      if (!existing.cardIds.includes(cardId)) existing.cardIds.push(cardId)
      return
    }
    byKey.set(key, {
      key,
      group: key.split("/")[0],
      arabic,
      translit,
      unit: unitOf(cardId),
      cardIds: [cardId],
    })
  }
  for (const c of cards) {
    switch (c.type) {
      case "letter":
      case "syllable":
      case "word":
      case "ayah":
        add(c.audio, c.id, c.arabic, c.translit)
        break
      case "drill":
        for (const it of c.items) add(it.audio, c.id, it.arabic, it.translit)
        break
      case "exercise":
        for (const it of c.items) {
          const keys = Array.isArray(it.audio) ? it.audio : it.audio ? [it.audio] : []
          // A two-clip item (same-or-different) shows one Arabic per clip.
          keys.forEach((k, i) =>
            add(
              k,
              c.id,
              keys.length > 1 && it.shown ? it.shown[i] : itemArabic(it),
              it.translit ?? "",
            ),
          )
        }
        break
      default:
        break
    }
  }
  return [...byKey.values()]
}

/** "212 of 330 recorded", per group too. */
export function audioProgress(keys: AudioKey[], rows: Pick<QaidaAudioRow, "audio_key">[]) {
  const have = new Set(rows.map((r) => r.audio_key))
  const groups: Record<string, { total: number; done: number }> = {}
  let done = 0
  for (const k of keys) {
    const g = (groups[k.group] ??= { total: 0, done: 0 })
    g.total++
    if (have.has(k.key)) {
      g.done++
      done++
    }
  }
  return { total: keys.length, done, groups }
}

/** The first key without a clip at or after `fromIndex`, wrapping around; null when everything is recorded. */
export function nextMissingKey(
  keys: AudioKey[],
  rows: Pick<QaidaAudioRow, "audio_key">[],
  fromIndex = 0,
): AudioKey | null {
  const have = new Set(rows.map((r) => r.audio_key))
  for (let n = 0; n < keys.length; n++) {
    const k = keys[(fromIndex + n) % keys.length]
    if (!have.has(k.key)) return k
  }
  return null
}
