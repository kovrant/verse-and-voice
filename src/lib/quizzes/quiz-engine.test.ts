import { describe, expect, it } from "vitest"

import { gradeQuizAttempt } from "./quiz-engine"
import type { QuizQuestion } from "./types"

describe("gradeQuizAttempt", () => {
  const sampleQuestions: QuizQuestion[] = [
    {
      id: "q1",
      quiz_id: "quiz1",
      question_text: "How many daily prayers are there?",
      question_type: "single_choice",
      options: [
        { id: "o1", text: "3", is_correct: false },
        { id: "o2", text: "5", is_correct: true },
        { id: "o3", text: "7", is_correct: false },
      ],
      explanation: "There are 5 daily prayers.",
      order_index: 1,
    },
    {
      id: "q2",
      quiz_id: "quiz1",
      question_text: "Fasting is in Ramadan. True or False?",
      question_type: "true_false",
      options: [
        { id: "t", text: "True", is_correct: true },
        { id: "f", text: "False", is_correct: false },
      ],
      explanation: "Ramadan is the month of fasting.",
      order_index: 2,
    },
    {
      id: "q3",
      quiz_id: "quiz1",
      question_text: "Select Holy Books revealed by Allah",
      question_type: "multi_choice",
      options: [
        { id: "b1", text: "Quran", is_correct: true },
        { id: "b2", text: "Tawrah", is_correct: true },
        { id: "b3", text: "Novel", is_correct: false },
      ],
      explanation: "Quran and Tawrah are divine revelations.",
      order_index: 3,
    },
  ]

  it("calculates 100% score when all questions answered correctly", () => {
    const answers = {
      q1: "o2",
      q2: "t",
      q3: ["b1", "b2"],
    }

    const result = gradeQuizAttempt(sampleQuestions, answers, 80)
    expect(result.score).toBe(3)
    expect(result.totalQuestions).toBe(3)
    expect(result.percentage).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.answersFeedback.q1?.isCorrect).toBe(true)
    expect(result.answersFeedback.q2?.isCorrect).toBe(true)
    expect(result.answersFeedback.q3?.isCorrect).toBe(true)
  })

  it("grades partial failures and handles passing thresholds", () => {
    const answers = {
      q1: "o2", // correct
      q2: "f", // wrong
      q3: ["b1"], // incomplete multi-choice
    }

    const result = gradeQuizAttempt(sampleQuestions, answers, 70)
    expect(result.score).toBe(1)
    expect(result.totalQuestions).toBe(3)
    expect(result.percentage).toBe(33)
    expect(result.passed).toBe(false)
    expect(result.answersFeedback.q2?.isCorrect).toBe(false)
    expect(result.answersFeedback.q2?.explanation).toBe("Ramadan is the month of fasting.")
  })

  it("handles empty answers gracefully", () => {
    const result = gradeQuizAttempt(sampleQuestions, {}, 80)
    expect(result.score).toBe(0)
    expect(result.totalQuestions).toBe(3)
    expect(result.percentage).toBe(0)
    expect(result.passed).toBe(false)
  })
})
