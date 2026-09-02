export type AchievementDomain = "quran" | "qaida" | "memorization" | "namaz" | "streak"

export type AchievementKind = "badge" | "certificate"

export interface AchievementDefinition {
  id: string
  slug: string
  domain: AchievementDomain
  kind: AchievementKind
  title: string
  description: string | null
  image_url: string | null
  issues_certificate: boolean
  metadata: Record<string, unknown>
}

export interface StudentAchievement {
  id: string
  student_id: string
  achievement_id: string
  earned_at: string
  source: string | null
  metadata: Record<string, unknown>
}

export interface StudentCertificate {
  id: string
  student_id: string
  achievement_id: string
  student_achievement_id: string | null
  certificate_number: string
  issued_at: string
  metadata: Record<string, unknown>
}

export interface AwardResult {
  awarded: boolean
  achievementId?: string
  certificateNumber?: string
}

/** Payload shapes passed into domain sync functions. */
export interface QuranRoundRef {
  id: string
  type: "qaida" | "quran"
  round_number: number
}

export interface QuranRoundProgress {
  desc: number
  asc: number
  completed_at: string | null
}

export interface MemChunkRef {
  id: string
  catalog_id: string
}
