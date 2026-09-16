import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import type { QuizAgeGroup, QuizCategory } from "@/lib/quizzes/types"

interface GenerateRequestBody {
  topic?: string
  age_group?: QuizAgeGroup
  category?: QuizCategory
  count?: number
}

interface GeneratedOption {
  id: string
  text: string
  is_correct: boolean
}

interface GeneratedQuestion {
  question_text: string
  question_type: "single_choice" | "true_false"
  options: GeneratedOption[]
  explanation: string
}

interface GeneratedQuizResponse {
  title: string
  description: string
  category: QuizCategory
  age_group: QuizAgeGroup
  passing_score: number
  badge_title: string
  badge_description: string
  questions: GeneratedQuestion[]
}

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: GenerateRequestBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const topic = (body.topic || "Islamic Knowledge").trim()
  const ageGroup = body.age_group || "all"
  const category = body.category || "general"
  const count = Math.min(Math.max(body.count || 4, 3), 8)

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (apiKey) {
    try {
      const prompt = `You are an expert Islamic educator designing a fun, engaging, and age-appropriate quiz for Muslim kids and youth.
Generate a high-quality Islamic quiz on the topic: "${topic}".
Target Age Group: "${ageGroup}" (Options are: "5-8", "9-12", "13-16", or "all").
Category: "${category}".
Number of Questions: ${count}.

Requirements:
- Questions must be 100% authentic, correct, and kid-friendly according to authentic Islamic teachings (Quran & Sunnah).
- For 5-8 years: Use simple words, joyful tone, clear concepts (e.g. basic pillars, kindness, Allah the Creator).
- For 9-12 years: Stories of Prophets, daily etiquettes, Ramadan, basic Seerah.
- For 13-16 years: Deeper Seerah insights, Companions, Islamic history, moral reasoning.
- Provide 1 clear, uplifting "Did you know?" fact/explanation per question.
- Suggest a creative badge title (e.g. "Ramadan Star", "Seerah Explorer", "Dua Champion").

Output MUST be raw valid JSON strictly matching this schema with NO markdown wrapping, codeblocks, or extra text:
{
  "title": "Quiz Title",
  "description": "Brief 1-2 sentence description",
  "category": "${category}",
  "age_group": "${ageGroup}",
  "passing_score": 80,
  "badge_title": "Badge Title",
  "badge_description": "Earned by mastering the Quiz Title",
  "questions": [
    {
      "question_text": "Question text here?",
      "question_type": "single_choice",
      "options": [
        { "id": "opt1", "text": "Option 1", "is_correct": true },
        { "id": "opt2", "text": "Option 2", "is_correct": false },
        { "id": "opt3", "text": "Option 3", "is_correct": false },
        { "id": "opt4", "text": "Option 4", "is_correct": false }
      ],
      "explanation": "Did you know explanation here."
    }
  ]
}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        },
      )

      if (res.ok) {
        const data = await res.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
          const parsed = JSON.parse(rawText) as GeneratedQuizResponse
          return NextResponse.json({ quiz: parsed })
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to smart Islamic template generator:", err)
    }
  }

  // Fallback intelligent template generator when API key is not configured
  const fallback = generateFallbackQuiz(topic, category, ageGroup, count)
  return NextResponse.json({ quiz: fallback })
}

function generateFallbackQuiz(
  topic: string,
  category: QuizCategory,
  ageGroup: QuizAgeGroup,
  count: number,
): GeneratedQuizResponse {
  const cleanTopic = topic.toLowerCase()

  if (cleanTopic.includes("prayer") || cleanTopic.includes("salah") || cleanTopic.includes("namaz")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "What is the very first prayer of the day before sunrise?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Fajr", is_correct: true },
          { id: "o2", text: "Dhuhr", is_correct: false },
          { id: "o3", text: "Asr", is_correct: false },
          { id: "o4", text: "Maghrib", is_correct: false },
        ],
        explanation: "Fajr is prayed before sunrise and brings barakah to your entire day!",
      },
      {
        question_text: "What must a Muslim perform before standing up for prayer?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Wudu (Ablution)", is_correct: true },
          { id: "o2", text: "Sleep", is_correct: false },
          { id: "o3", text: "Breakfast", is_correct: false },
          { id: "o4", text: "A run", is_correct: false },
        ],
        explanation: "Wudu purifies both body and soul before speaking to Allah in Salah.",
      },
      {
        question_text: "Which direction do Muslims face when praying Salah?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Towards the Qiblah (the Kaaba in Makkah)", is_correct: true },
          { id: "o2", text: "Towards the North Pole", is_correct: false },
          { id: "o3", text: "Towards the East always", is_correct: false },
          { id: "o4", text: "Any direction", is_correct: false },
        ],
        explanation: "The Qiblah unites all Muslims around the world facing the sacred Kaaba.",
      },
      {
        question_text: "In Salah, bowing down with hands on your knees is called Ruku. True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Ruku is the bowing position where we say Subhana Rabbiyal Azeem.",
      },
    ]

    return {
      title: `${topic} Quest`,
      description: "Discover the beauty and rewards of the 5 daily prayers in Islam!",
      category: "fiqh",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Salah Champion",
      badge_description: `Awarded for completing the ${topic} Quest`,
      questions: questions.slice(0, count),
    }
  }

  if (cleanTopic.includes("musa") || cleanTopic.includes("moses")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "Which holy book was revealed to Prophet Musa (AS)?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Tawrah (Torah)", is_correct: true },
          { id: "o2", text: "Injeel", is_correct: false },
          { id: "o3", text: "Zabur", is_correct: false },
          { id: "o4", text: "Quran", is_correct: false },
        ],
        explanation: "The Tawrah was revealed to Musa (AS) on Mount Sinai.",
      },
      {
        question_text: "Which brother of Prophet Musa (AS) was also chosen by Allah as a Prophet?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Prophet Harun (Aaron) AS", is_correct: true },
          { id: "o2", text: "Prophet Yusuf AS", is_correct: false },
          { id: "o3", text: "Prophet Dawud AS", is_correct: false },
          { id: "o4", text: "Prophet Yahya AS", is_correct: false },
        ],
        explanation: "Harun (AS) was gifted with eloquent speech and supported Musa (AS).",
      },
      {
        question_text: "What happened when Prophet Musa (AS) struck the sea with his staff?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "The sea parted into dry paths by Allah's command", is_correct: true },
          { id: "o2", text: "A boat appeared", is_correct: false },
          { id: "o3", text: "It started raining", is_correct: false },
          { id: "o4", text: "Nothing happened", is_correct: false },
        ],
        explanation: "Allah parted the sea to save the Believers from Pharaoh's army.",
      },
    ]

    return {
      title: `Prophet Musa (AS) Adventure`,
      description: "Learn about the brave story of Prophet Musa (AS), the Red Sea, and Mount Sinai.",
      category: "prophets",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Courage & Faith Hero",
      badge_description: "Mastered the story of Prophet Musa (AS)",
      questions: questions.slice(0, count),
    }
  }

  // Default dynamic Islamic quiz
  const defaultQuestions: GeneratedQuestion[] = [
    {
      question_text: `What is the most beloved deed to Allah?`,
      question_type: "single_choice",
      options: [
        { id: "o1", text: "Prayer performed on its proper time", is_correct: true },
        { id: "o2", text: "Sleeping late", is_correct: false },
        { id: "o3", text: "Watching TV", is_correct: false },
        { id: "o4", text: "Eating candy", is_correct: false },
      ],
      explanation: "Prophet Muhammad (PBUH) taught that praying on time brings great reward.",
    },
    {
      question_text: `Saying 'Bismillah' before eating brings Allah's blessing into our food. True or False?`,
      question_type: "true_false",
      options: [
        { id: "t", text: "True", is_correct: true },
        { id: "f", text: "False", is_correct: false },
      ],
      explanation: "Starting every good deed with Bismillah invites Allah's barakah.",
    },
    {
      question_text: `Which companion was the first Caliph of Islam?`,
      question_type: "single_choice",
      options: [
        { id: "o1", text: "Abu Bakr As-Siddiq (RA)", is_correct: true },
        { id: "o2", text: "Umar ibn Al-Khattab (RA)", is_correct: false },
        { id: "o3", text: "Uthman ibn Affan (RA)", is_correct: false },
        { id: "o4", text: "Ali ibn Abi Talib (RA)", is_correct: false },
      ],
      explanation: "Abu Bakr (RA) was the closest friend and first Caliph after the Prophet (PBUH).",
    },
    {
      question_text: `Smiling at someone is considered a form of charity (Sadaqah) in Islam. True or False?`,
      question_type: "true_false",
      options: [
        { id: "t", text: "True", is_correct: true },
        { id: "f", text: "False", is_correct: false },
      ],
      explanation: "Spreading joy and kindness with a warm smile is rewarded as Sadaqah!",
    },
  ]

  return {
    title: `${topic} Challenge`,
    description: `Test and grow your knowledge on ${topic}!`,
    category,
    age_group: ageGroup,
    passing_score: 80,
    badge_title: `${topic} Explorer`,
    badge_description: `Completed the ${topic} Challenge`,
    questions: defaultQuestions.slice(0, count),
  }
}
