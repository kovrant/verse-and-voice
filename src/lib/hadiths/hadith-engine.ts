import { HADITH_BADGE_SLUGS, HadithStats, HadithTopic, HadithWithProgress } from "./types"

export interface TopicInfo {
  key: HadithTopic
  label: string
  urduLabel: string
  icon: string
  color: string
  bgColor: string
}

export const HADITH_TOPICS: Record<HadithTopic, TopicInfo> = {
  manners: {
    key: "manners",
    label: "Manners & Character",
    urduLabel: "اخلاق و آداب",
    icon: "🌟",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  cleanliness: {
    key: "cleanliness",
    label: "Cleanliness & Purity",
    urduLabel: "طہارت و صفائی",
    icon: "💧",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  purity: {
    key: "purity",
    label: "Cleanliness & Purity",
    urduLabel: "طہارت و صفائی",
    icon: "💧",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  knowledge: {
    key: "knowledge",
    label: "Knowledge & Learning",
    urduLabel: "علم و تعلیم",
    icon: "📚",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  kindness: {
    key: "kindness",
    label: "Kindness & Smiling",
    urduLabel: "حسن سلوک و مسکراہٹ",
    icon: "😊",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  mercy: {
    key: "mercy",
    label: "Mercy & Compassion",
    urduLabel: "رحمت و شفقت",
    icon: "🕊️",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10 border-rose-500/20",
  },
  truthfulness: {
    key: "truthfulness",
    label: "Truthfulness & Honesty",
    urduLabel: "سچائی و امانت",
    icon: "💎",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  family: {
    key: "family",
    label: "Parents & Family",
    urduLabel: "والدین و رشتے دار",
    icon: "🏡",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10 border-pink-500/20",
  },
  prayer: {
    key: "prayer",
    label: "Prayer & Worship",
    urduLabel: "نماز و عبادت",
    icon: "🤲",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
  },
  good_deeds: {
    key: "good_deeds",
    label: "Good Deeds",
    urduLabel: "نیک اعمال",
    icon: "🌱",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10 border-teal-500/20",
  },
  general: {
    key: "general",
    label: "Faith & Wisdom",
    urduLabel: "ایمان و حکمت",
    icon: "✨",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
  },
}

/**
 * Returns badge slugs that the student qualifies for based on their total memorized Hadiths count.
 */
export function getEligibleHadithBadgeSlugs(memorizedCount: number): string[] {
  const slugs: string[] = []
  if (memorizedCount >= 5) {
    slugs.push(HADITH_BADGE_SLUGS.EXPLORER)
  }
  if (memorizedCount >= 15) {
    slugs.push(HADITH_BADGE_SLUGS.CHAMPION)
  }
  if (memorizedCount >= 40) {
    slugs.push(HADITH_BADGE_SLUGS.ARBAIN_SCHOLAR)
  }
  if (memorizedCount >= 50) {
    slugs.push(HADITH_BADGE_SLUGS.GRAND_SCHOLAR)
  }
  return slugs
}

/**
 * Computes the next milestone target and progress percentage.
 */
export function getHadithNextMilestone(memorizedCount: number): {
  current: number
  target: number
  badgeTitle: string
  percentage: number
  isComplete: boolean
} {
  if (memorizedCount >= 50) {
    return {
      current: memorizedCount,
      target: 50,
      badgeTitle: "Grand Sunnah Scholar (50 Hadiths Master)",
      percentage: 100,
      isComplete: true,
    }
  }
  if (memorizedCount >= 40) {
    const target = 50
    return {
      current: memorizedCount,
      target,
      badgeTitle: "Grand Sunnah Scholar (50 Hadiths)",
      percentage: Math.min(100, Math.round((memorizedCount / target) * 100)),
      isComplete: false,
    }
  }
  if (memorizedCount >= 15) {
    const target = 40
    return {
      current: memorizedCount,
      target,
      badgeTitle: "Arba'in Scholar (40 Hadiths)",
      percentage: Math.min(100, Math.round((memorizedCount / target) * 100)),
      isComplete: false,
    }
  }
  if (memorizedCount >= 5) {
    const target = 15
    return {
      current: memorizedCount,
      target,
      badgeTitle: "Sunnah Champion (15 Hadiths)",
      percentage: Math.min(100, Math.round((memorizedCount / target) * 100)),
      isComplete: false,
    }
  }
  const target = 5
  return {
    current: memorizedCount,
    target,
    badgeTitle: "Hadith Explorer (5 Hadiths)",
    percentage: Math.min(100, Math.round((memorizedCount / target) * 100)),
    isComplete: false,
  }
}

/**
 * Computes overview statistics for a student's Hadith collection.
 */
export function calculateHadithStats(hadiths: HadithWithProgress[]): HadithStats {
  let memorized = 0
  let memorizing = 0
  let reading = 0
  let assignedCount = 0

  for (const h of hadiths) {
    if (h.is_assigned) assignedCount++
    if (!h.progress) continue
    if (h.progress.status === "memorized") {
      memorized++
    } else if (h.progress.status === "memorizing") {
      memorizing++
    } else if (h.progress.status === "reading") {
      reading++
    }
  }

  return {
    total: hadiths.length,
    memorized,
    memorizing,
    reading,
    assignedCount,
  }
}

/**
 * Splits Arabic text into individual word tokens for the interactive Memory Peek game.
 */
export function splitArabicWords(arabicText: string): string[] {
  if (!arabicText) return []
  return arabicText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
}
