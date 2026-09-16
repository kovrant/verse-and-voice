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

      const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
      ]

      let generatedData: GeneratedQuizResponse | null = null

      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
              generatedData = JSON.parse(rawText) as GeneratedQuizResponse
              break
            }
          } else {
            const errText = await res.text()
            console.warn(`Gemini model ${model} failed with status ${res.status}:`, errText)
          }
        } catch (modelErr) {
          console.warn(`Error attempting Gemini model ${model}:`, modelErr)
        }
      }

      if (generatedData) {
        return NextResponse.json({ quiz: generatedData, source: "gemini_ai" })
      }
    } catch (err) {
      console.warn("Gemini AI generation failed, falling back to smart Islamic template generator:", err)
    }
  }

  // Fallback intelligent template generator when API key is not configured or fails
  const fallback = generateFallbackQuiz(topic, category, ageGroup, count)
  return NextResponse.json({
    quiz: fallback,
    source: "offline_template",
    notice: !apiKey ? "GEMINI_API_KEY is not configured in .env.local; generated using offline Islamic knowledge base." : undefined
  })
}

function generateFallbackQuiz(
  topic: string,
  category: QuizCategory,
  ageGroup: QuizAgeGroup,
  count: number,
): GeneratedQuizResponse {
  const cleanTopic = topic.toLowerCase()

  // 1. Prophet Adam (AS)
  if (cleanTopic.includes("adam")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "Who was the very first human being and the first Prophet created by Allah?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Prophet Adam (AS)", is_correct: true },
          { id: "o2", text: "Prophet Nuh (AS)", is_correct: false },
          { id: "o3", text: "Prophet Ibrahim (AS)", is_correct: false },
          { id: "o4", text: "Prophet Musa (AS)", is_correct: false },
        ],
        explanation: "Prophet Adam (AS) is the father of all mankind and the first prophet.",
      },
      {
        question_text: "From what substance did Allah create Prophet Adam (AS)?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Clay / Earth (Soil)", is_correct: true },
          { id: "o2", text: "Pure Light (Noor)", is_correct: false },
          { id: "o3", text: "Smokeless Fire", is_correct: false },
          { id: "o4", text: "Water only", is_correct: false },
        ],
        explanation: "Allah created angels from light, jinn from smokeless fire, and Adam (AS) from clay.",
      },
      {
        question_text: "Who was the wife of Prophet Adam (AS)?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Hawwa (Eve)", is_correct: true },
          { id: "o2", text: "Maryam", is_correct: false },
          { id: "o3", text: "Asiya", is_correct: false },
          { id: "o4", text: "Khadijah", is_correct: false },
        ],
        explanation: "Hawwa (AS) was created by Allah to be the blessed partner of Adam (AS).",
      },
      {
        question_text: "Who refused to prostrate to Adam (AS) out of arrogance and pride?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Iblis (Satan)", is_correct: true },
          { id: "o2", text: "Angel Jibreel", is_correct: false },
          { id: "o3", text: "Angel Mikael", is_correct: false },
          { id: "o4", text: "Angel Israfil", is_correct: false },
        ],
        explanation: "All the angels obeyed Allah and prostrated, but Iblis refused due to arrogance.",
      },
      {
        question_text: "Allah taught Prophet Adam (AS) the names of all things. True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Allah honored Adam (AS) with special divine knowledge and taught him the names of all things.",
      },
    ]

    return {
      title: `Prophet Adam (AS) - The First Prophet`,
      description: "Discover the inspiring story of the creation of Prophet Adam (AS) and Hawwa.",
      category: "prophets",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Adam (AS) Knowledge Seeker",
      badge_description: "Mastered the story of Prophet Adam (AS)",
      questions: questions.slice(0, count),
    }
  }

  // 2. Prophet Ibrahim (AS)
  if (cleanTopic.includes("ibrahim") || cleanTopic.includes("abraham")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "What special title was given to Prophet Ibrahim (AS)?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Khalilullah (Friend of Allah)", is_correct: true },
          { id: "o2", text: "Kaleemullah", is_correct: false },
          { id: "o3", text: "Roohullah", is_correct: false },
          { id: "o4", text: "Habibullah", is_correct: false },
        ],
        explanation: "Prophet Ibrahim (AS) had immense devotion and was titled Khalilullah (Friend of Allah).",
      },
      {
        question_text: "Who helped Prophet Ibrahim (AS) rebuild the Kaaba in Makkah?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "His son Prophet Ismail (AS)", is_correct: true },
          { id: "o2", text: "His son Prophet Ishaq (AS)", is_correct: false },
          { id: "o3", text: "Prophet Lut (AS)", is_correct: false },
          { id: "o4", text: "Prophet Musa (AS)", is_correct: false },
        ],
        explanation: "Ibrahim (AS) and Ismail (AS) raised the foundations of the holy Kaaba together.",
      },
      {
        question_text: "What happened to the raging fire when King Nimrod threw Prophet Ibrahim (AS) into it?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Allah commanded it to be cool and peaceful", is_correct: true },
          { id: "o2", text: "It burned him", is_correct: false },
          { id: "o3", text: "Rain put it out immediately", is_correct: false },
          { id: "o4", text: "The angels carried the fire away", is_correct: false },
        ],
        explanation: "Allah said: 'O fire, be cool and peaceful for Ibrahim!' (Quran 21:69).",
      },
      {
        question_text: "Prophet Ibrahim (AS) always stood firm against idol worship and preached pure Monotheism (Tawhid). True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Prophet Ibrahim (AS) dedicated his entire life to worshiping Allah alone.",
      },
    ]

    return {
      title: `Prophet Ibrahim (AS) - Friend of Allah`,
      description: "Learn about the unwavering faith and courage of Prophet Ibrahim (AS).",
      category: "prophets",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Ibrahim (AS) Faith Champion",
      badge_description: "Mastered the story of Prophet Ibrahim (AS)",
      questions: questions.slice(0, count),
    }
  }

  // 3. Prophet Muhammad (PBUH) & Seerah
  if (cleanTopic.includes("muhammad") || cleanTopic.includes("seerah") || cleanTopic.includes("prophet")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "In which blessed city was Prophet Muhammad (PBUH) born?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Makkah", is_correct: true },
          { id: "o2", text: "Madinah", is_correct: false },
          { id: "o3", text: "Jerusalem (Al-Quds)", is_correct: false },
          { id: "o4", text: "Taif", is_correct: false },
        ],
        explanation: "The Prophet (PBUH) was born in Makkah in the Year of the Elephant (570 CE).",
      },
      {
        question_text: "What title did the people of Makkah give the Prophet (PBUH) even before prophethood due to his honesty?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Al-Sadiq & Al-Amin (The Truthful & Trustworthy)", is_correct: true },
          { id: "o2", text: "Al-Malik (The King)", is_correct: false },
          { id: "o3", text: "Al-Hakim (The Ruler)", is_correct: false },
          { id: "o4", text: "Al-Qari", is_correct: false },
        ],
        explanation: "He was widely beloved and respected for his spotless honesty and integrity.",
      },
      {
        question_text: "In which cave did Prophet Muhammad (PBUH) receive the very first revelation of the Quran?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Cave Hira", is_correct: true },
          { id: "o2", text: "Cave Thawr", is_correct: false },
          { id: "o3", text: "Cave of Kahf", is_correct: false },
          { id: "o4", text: "Mount Uhud", is_correct: false },
        ],
        explanation: "Angel Jibreel brought the first verses ('Iqra!') in Cave Hira on Jabal al-Noor.",
      },
      {
        question_text: "Prophet Muhammad (PBUH) was sent as a mercy to all of creation. True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Allah says in the Quran: 'And We have not sent you except as a mercy to the worlds.'",
      },
    ]

    return {
      title: `Seerah: Life of Prophet Muhammad (PBUH)`,
      description: "Discover the beautiful life, noble character, and message of the final Messenger (PBUH).",
      category: "seerah",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Seerah Scholar",
      badge_description: "Mastered the foundational Seerah of Prophet Muhammad (PBUH)",
      questions: questions.slice(0, count),
    }
  }

  // 4. Prayer / Salah
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

  // 5. Prophet Musa (AS)
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

  // 6. Quran / Holy Quran
  if (cleanTopic.includes("quran") || cleanTopic.includes("surah") || cleanTopic.includes("ayah")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "How many Surahs (chapters) are in the Holy Quran?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "114", is_correct: true },
          { id: "o2", text: "30", is_correct: false },
          { id: "o3", text: "60", is_correct: false },
          { id: "o4", text: "100", is_correct: false },
        ],
        explanation: "The Holy Quran consists of 114 Surahs divided across 30 Paras (Juz).",
      },
      {
        question_text: "What is the very first Surah in the Holy Quran?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Surah Al-Fatihah", is_correct: true },
          { id: "o2", text: "Surah Al-Baqarah", is_correct: false },
          { id: "o3", text: "Surah Al-Ikhlas", is_correct: false },
          { id: "o4", text: "Surah Ya-Sin", is_correct: false },
        ],
        explanation: "Surah Al-Fatihah ('The Opening') is recited in every unit (rak'ah) of prayer.",
      },
      {
        question_text: "Which angel was responsible for bringing the Quran to Prophet Muhammad (PBUH)?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Angel Jibreel (Gabriel)", is_correct: true },
          { id: "o2", text: "Angel Mikael", is_correct: false },
          { id: "o3", text: "Angel Malik", is_correct: false },
          { id: "o4", text: "Angel Israfil", is_correct: false },
        ],
        explanation: "Angel Jibreel brought Allah's revelations over a period of 23 years.",
      },
      {
        question_text: "The Quran is the protected word of Allah and has remained unchanged. True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Allah promised in the Quran: 'Indeed, it is We who sent down the Quran and indeed, We will be its guardian.'",
      },
    ]

    return {
      title: `Quran Knowledge Quest`,
      description: "Test your understanding and love for the Holy Quran.",
      category: "quran",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Quran Scholar Junior",
      badge_description: "Mastered the Quran Knowledge Quest",
      questions: questions.slice(0, count),
    }
  }

  // 7. Ramadan & Fasting (Sawm)
  if (cleanTopic.includes("ramadan") || cleanTopic.includes("fasting") || cleanTopic.includes("roza") || cleanTopic.includes("sawm")) {
    const questions: GeneratedQuestion[] = [
      {
        question_text: "What is the pre-dawn meal called before starting the fast?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Suhoor (Sehri)", is_correct: true },
          { id: "o2", text: "Iftar", is_correct: false },
          { id: "o3", text: "Walima", is_correct: false },
          { id: "o4", text: "Brunch", is_correct: false },
        ],
        explanation: "Eating Suhoor gives barakah and physical energy for the fast.",
      },
      {
        question_text: "What is the meal eaten at sunset to break the fast called?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Iftar", is_correct: true },
          { id: "o2", text: "Suhoor", is_correct: false },
          { id: "o3", text: "Aqiqa", is_correct: false },
          { id: "o4", text: "Tahajjud", is_correct: false },
        ],
        explanation: "Breaking the fast at Maghrib time is a moment of joy and answered prayers.",
      },
      {
        question_text: "In which Islamic month was the Holy Quran first revealed?",
        question_type: "single_choice",
        options: [
          { id: "o1", text: "Ramadan", is_correct: true },
          { id: "o2", text: "Shawwal", is_correct: false },
          { id: "o3", text: "Muharram", is_correct: false },
          { id: "o4", text: "Dhul Hijjah", is_correct: false },
        ],
        explanation: "Ramadan is known as the Month of the Quran (Surah Al-Baqarah 2:185).",
      },
      {
        question_text: "Laylatul Qadr (The Night of Decree) is better than a thousand months. True or False?",
        question_type: "true_false",
        options: [
          { id: "t", text: "True", is_correct: true },
          { id: "f", text: "False", is_correct: false },
        ],
        explanation: "Worship on Laylatul Qadr carries the reward of worshiping for over 83 years!",
      },
    ]

    return {
      title: `Ramadan & Fasting Star`,
      description: "Learn all about the blessed month of Ramadan and fasting.",
      category: "fiqh",
      age_group: ageGroup,
      passing_score: 80,
      badge_title: "Ramadan Champion",
      badge_description: "Mastered the Ramadan & Fasting Quiz",
      questions: questions.slice(0, count),
    }
  }

  // Default dynamic Islamic quiz
  const defaultQuestions: GeneratedQuestion[] = [
    {
      question_text: `What is the first pillar of Islam?`,
      question_type: "single_choice",
      options: [
        { id: "o1", text: "Shahada (Faith in Allah and Prophet Muhammad PBUH)", is_correct: true },
        { id: "o2", text: "Salah (Prayer)", is_correct: false },
        { id: "o3", text: "Zakat (Charity)", is_correct: false },
        { id: "o4", text: "Hajj (Pilgrimage)", is_correct: false },
      ],
      explanation: "The Shahada is the declaration of faith that there is no god but Allah, and Muhammad is His messenger.",
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

