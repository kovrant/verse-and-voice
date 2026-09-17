export type HadithTopic =
  | "manners"
  | "cleanliness"
  | "purity"
  | "knowledge"
  | "kindness"
  | "mercy"
  | "truthfulness"
  | "family"
  | "prayer"
  | "good_deeds"
  | "general"

export type HadithStatus = "reading" | "memorizing" | "memorized"

export interface Hadith {
  id: string
  hadith_number: number
  title?: string
  arabic_text: string
  english_text: string
  urdu_text: string
  kids_lesson: string
  narrator?: string | null
  reference: string
  topic: HadithTopic
  order_index: number
  is_published: boolean
  created_at?: string
  updated_at?: string
}

export interface StudentHadithProgress {
  id: string
  student_id: string
  hadith_id: string
  status: HadithStatus
  memorized_at?: string | null
  updated_at?: string
}

export interface HadithAssignment {
  id: string
  hadith_id: string
  student_id: string
  status: "pending" | "completed"
  assigned_at?: string
  due_date?: string | null
  hadiths?: Hadith
}

export interface HadithWithProgress extends Hadith {
  progress?: StudentHadithProgress | null
  is_assigned?: boolean
}

export interface HadithStats {
  total: number
  memorized: number
  memorizing: number
  reading: number
  assignedCount: number
}

export const HADITH_BADGE_SLUGS = {
  EXPLORER: "hadith-explorer",
  CHAMPION: "hadith-champion",
  ARBAIN_SCHOLAR: "hadith-arbain-scholar",
  GRAND_SCHOLAR: "hadith-grand-scholar",
} as const
