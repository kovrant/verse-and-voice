import type { QuizGradeResult, QuizQuestion } from "./types"

/**
 * Grades a quiz submission against the question set and passing threshold.
 * Pure function suitable for unit tests and server/client execution.
 */
export function gradeQuizAttempt(
  questions: QuizQuestion[],
  submittedAnswers: Record<string, string | string[]>,
  passingScore = 80,
): QuizGradeResult {
  let score = 0
  const totalQuestions = questions.length
  const answersFeedback: QuizGradeResult["answersFeedback"] = {}

  for (const question of questions) {
    const correctOptions = question.options.filter((o) => o.is_correct).map((o) => o.id)
    const submitted = submittedAnswers[question.id]

    let isCorrect = false

    if (question.question_type === "multi_choice") {
      const selectedArr = Array.isArray(submitted)
        ? submitted
        : typeof submitted === "string"
          ? [submitted]
          : []
      const selectedSet = new Set(selectedArr)
      const correctSet = new Set(correctOptions)

      if (
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((val) => correctSet.has(val))
      ) {
        isCorrect = true
      }
    } else {
      // single_choice or true_false
      const selectedId = Array.isArray(submitted) ? submitted[0] : submitted
      if (selectedId && correctOptions.includes(selectedId)) {
        isCorrect = true
      }
    }

    if (isCorrect) {
      score += 1
    }

    answersFeedback[question.id] = {
      isCorrect,
      correctOptionIds: correctOptions,
      explanation: question.explanation,
    }
  }

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const passed = percentage >= passingScore

  return {
    score,
    totalQuestions,
    percentage,
    passed,
    answersFeedback,
  }
}

export const CATEGORY_LABELS: Record<string, { label: string; iconName: string; color: string }> = {
  general: { label: "General Knowledge", iconName: "Sparkles", color: "text-amber-500" },
  seerah: { label: "Seerah (Prophet's Life)", iconName: "BookOpen", color: "text-emerald-500" },
  prophets: { label: "Stories of Prophets", iconName: "Compass", color: "text-teal-500" },
  quran: { label: "Holy Quran", iconName: "BookText", color: "text-blue-500" },
  hadith: { label: "Hadith & Sunnah", iconName: "ScrollText", color: "text-purple-500" },
  fiqh: { label: "Islamic Manners & Fiqh", iconName: "CheckCircle", color: "text-green-500" },
  events: { label: "Islamic Events & Ramadan", iconName: "Moon", color: "text-amber-400" },
}

export const AGE_GROUP_LABELS: Record<string, string> = {
  "5-8": "Kids (5-8 yrs)",
  "9-12": "Junior (9-12 yrs)",
  "13-16": "Teens (13-16 yrs)",
  all: "All Ages",
}
