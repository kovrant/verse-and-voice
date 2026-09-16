export type QuizCategory =
  | "general"
  | "seerah"
  | "prophets"
  | "quran"
  | "hadith"
  | "fiqh"
  | "events"

export type QuizAgeGroup = "5-8" | "9-12" | "13-16" | "all"

export type QuestionType = "single_choice" | "multi_choice" | "true_false"

export interface QuizOption {
  id: string
  text: string
  is_correct: boolean
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_type: QuestionType
  options: QuizOption[]
  explanation?: string | null
  order_index: number
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  category: QuizCategory
  age_group: QuizAgeGroup
  passing_score: number
  badge_slug: string
  badge_title: string
  badge_description: string | null
  is_published: boolean
  created_at?: string
  questions?: QuizQuestion[]
}

export interface QuizAssignment {
  id: string
  quiz_id: string
  student_id: string
  status: "pending" | "completed"
  assigned_at: string
  due_date?: string | null
  quiz?: Quiz
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  assignment_id?: string | null
  score: number
  total_questions: number
  percentage: number
  passed: boolean
  answers: Record<string, string | string[]>
  completed_at: string
  student?: {
    id: string
    name: string
    username?: string
  }
}

export interface QuizGradeResult {
  score: number
  totalQuestions: number
  percentage: number
  passed: boolean
  answersFeedback: Record<
    string,
    {
      isCorrect: boolean
      correctOptionIds: string[]
      explanation?: string | null
    }
  >
}
