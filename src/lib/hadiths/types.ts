export type HadithTopic =
  | "manners"
  | "cleanliness"
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
  title: string
  arabic_text: string
  english_translation: string
  urdu_translation: string
  kid_lesson: string
  narrator: string
  reference: string
  topic: HadithTopic
  order_index: number
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface StudentHadithProgress {
  id: string
  student_id: string
  hadith_id: string
  status: HadithStatus
  memorized_at?: string | null
  practice_count: number
  created_at: string
  updated_at: string
}

export interface HadithAssignment {
  id: string
  teacher_id: string
  student_id: string
  hadith_id: string
  assigned_at: string
  due_date?: string | null
  notes?: string | null
  completed_at?: string | null
  hadith?: Hadith
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
