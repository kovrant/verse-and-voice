import type { AchievementDomain } from "./types"

export interface TrophyItem {
  slug: string
  domain: AchievementDomain
  title: string
  description: string | null
  earned_at: string
  issues_certificate: boolean
}

export interface MemLessonGroup {
  lessonTitle: string
  complete: TrophyItem | null
  parts: TrophyItem[]
}

export interface GroupedTrophies {
  quranMilestones: TrophyItem[]
  quranParas: number[]
  qaida: TrophyItem[]
  namaz: TrophyItem[]
  memorization: MemLessonGroup[]
}

const PARA_SLUG = /^para_(\d+)$/

export function parseMemPartTitle(title: string): { partLabel: string; lessonTitle: string } | null {
  const sep = title.indexOf(" · ")
  if (sep === -1) return null
  return { partLabel: title.slice(0, sep), lessonTitle: title.slice(sep + 3) }
}

export function groupTrophies(items: TrophyItem[]): GroupedTrophies {
  const quranMilestones: TrophyItem[] = []
  const quranParas = new Set<number>()
  const qaida: TrophyItem[] = []
  const namaz: TrophyItem[] = []
  const memMap = new Map<string, MemLessonGroup>()

  for (const item of items) {
    switch (item.domain) {
      case "quran": {
        const m = item.slug.match(PARA_SLUG)
        if (m) quranParas.add(Number(m[1]))
        else quranMilestones.push(item)
        break
      }
      case "qaida":
        qaida.push(item)
        break
      case "namaz":
        namaz.push(item)
        break
      case "memorization":
        if (item.slug.startsWith("mem_lesson_")) {
          const g = memMap.get(item.title) ?? { lessonTitle: item.title, complete: null, parts: [] }
          g.complete = item
          g.lessonTitle = item.title
          memMap.set(item.title, g)
        } else if (item.slug.startsWith("mem_part_")) {
          const parsed = parseMemPartTitle(item.title)
          const lessonTitle = parsed?.lessonTitle ?? item.title
          const g = memMap.get(lessonTitle) ?? { lessonTitle, complete: null, parts: [] }
          g.parts.push(item)
          memMap.set(lessonTitle, g)
        }
        break
    }
  }

  const memorization = [...memMap.values()]
    .map((g) => ({
      ...g,
      parts: [...g.parts].sort((a, b) => {
        const na = Number(a.title.match(/Part (\d+)/)?.[1] ?? 0)
        const nb = Number(b.title.match(/Part (\d+)/)?.[1] ?? 0)
        return na - nb
      }),
    }))
    .sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle))

  return {
    quranMilestones,
    quranParas: [...quranParas].sort((a, b) => a - b),
    qaida,
    namaz,
    memorization,
  }
}

/** Human summary for the page header — avoids counting every mem part as a "badge". */
export function trophyHeadline(grouped: GroupedTrophies, certificateCount: number): string {
  const bits: string[] = []
  if (certificateCount > 0) {
    bits.push(`${certificateCount} certificate${certificateCount === 1 ? "" : "s"}`)
  }
  if (grouped.quranParas.length > 0) {
    bits.push(`${grouped.quranParas.length}/30 paras`)
  }
  if (grouped.quranMilestones.length > 0) {
    bits.push(`${grouped.quranMilestones.length} milestone${grouped.quranMilestones.length === 1 ? "" : "s"}`)
  }
  const memLessons = grouped.memorization.filter((g) => g.complete || g.parts.length > 0).length
  if (memLessons > 0) {
    bits.push(`${memLessons} lesson${memLessons === 1 ? "" : "s"}`)
  }
  if (grouped.qaida.length + grouped.namaz.length > 0) {
    bits.push(`${grouped.qaida.length + grouped.namaz.length} special`)
  }
  return bits.length > 0 ? bits.join(" · ") : "No trophies yet"
}
