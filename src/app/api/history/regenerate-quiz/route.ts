import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import {
  normalizeTopicSlug,
  removeEmDashes,
} from "@/lib/history"
import type { QuizAgeGroup, QuizCategory } from "@/lib/quizzes/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface RegenerateQuizRequestBody {
  story_id?: string
}

interface GeneratedQuizQuestion {
  question_text: string
  question_type: "single_choice"
  options: { id: string; text: string; is_correct: boolean }[]
  explanation: string
}

interface GeneratedQuizData {
  title: string
  description: string
  badge_title: string
  badge_description: string
  questions: GeneratedQuizQuestion[]
}

function ensureFourOptions(
  options: { id: string; text: string; is_correct: boolean }[],
): { id: string; text: string; is_correct: boolean }[] {
  if (!Array.isArray(options)) return []
  const opts = [...options]
  const fallbackDistracters = [
    "None of the above",
    "All of the above",
    "It is not mentioned in authentic narrations",
    "Only under special circumstances",
  ]
  let idx = 0
  while (opts.length < 4) {
    const id = `o${opts.length + 1}`
    const text = fallbackDistracters[idx % fallbackDistracters.length]
    idx++
    opts.push({ id, text, is_correct: false })
  }
  return opts
}

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: RegenerateQuizRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const storyId = body.story_id?.trim()
  if (!storyId) {
    return NextResponse.json({ error: "story_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch the story
  const { data: story, error: storyError } = await admin
    .from("islamic_history")
    .select("*")
    .eq("id", storyId)
    .maybeSingle()

  if (storyError || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 })
  }

  // 2. Strict Rule: Check if an existing quiz is published
  if (story.quiz_id) {
    const { data: existingQuiz } = await admin
      .from("quizzes")
      .select("id, title, is_published")
      .eq("id", story.quiz_id)
      .maybeSingle()

    if (existingQuiz) {
      if (existingQuiz.is_published) {
        return NextResponse.json(
          {
            error:
              "The linked quiz is currently published. Published quizzes cannot be replaced or deleted. Please unpublish the quiz first before regenerating.",
            is_published: true,
            quiz_id: existingQuiz.id,
          },
          { status: 400 },
        )
      }

      // Safe to clean up the old draft quiz before replacing
      try {
        await admin.from("quizzes").delete().eq("id", existingQuiz.id)
      } catch (cleanErr) {
        console.warn("Failed to remove old draft quiz during regeneration:", cleanErr)
      }
    }
  }

  // 3. Category & topic mapping
  const quizCategoryMap: Record<string, QuizCategory> = {
    Prophets: "prophets",
    Seerah: "seerah",
    Companions: "seerah",
    Battles: "events",
    Events: "events",
    Places: "general",
    Other: "general",
  }
  const quizCat: QuizCategory = quizCategoryMap[story.category] || "prophets"
  const topicSlug = story.topic_slug || normalizeTopicSlug(story.title)

  // 4. Generate Quiz Questions via Gemini or Fallback
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  let quizData: GeneratedQuizData | null = null

  if (apiKey) {
    const prompt = `You are a master Islamic educator and children's quiz designer.
Your task is to generate an exciting, high-quality 4 to 5 question multiple-choice quiz directly based on this Islamic storybook.

STRICT REQUIREMENTS:
1. ⛔ STRICT ZERO EM DASH (—) BAN RULE:
   - NEVER EVER use an em dash ("—", "\\u2014", or "–") anywhere in the questions, options, or explanations!
   - Use commas, periods, or simple kid-friendly punctuation.
2. Generate 4 to 5 multiple-choice questions (minimum 4 questions).
3. EVERY QUESTION MUST HAVE AT LEAST 4 DISTINCT OPTIONS ("o1", "o2", "o3", "o4") with exactly 1 "is_correct: true".
4. Questions must test key character virtues, events, takeaways, and lessons directly found in the story.
5. Provide a child-friendly explanation for each question.

Story Title: "${story.title}"
Target Age Group: "${story.target_age_group || "9-12"}"
Hero Virtue: "${story.hero_virtue || "Good Character"}"
Story Summary: "${story.summary || ""}"
Story Content:
${story.content || ""}
${story.quran_gem ? `Quran Gem: Surah ${story.quran_gem.surah_name} (${story.quran_gem.ayah_number}) - ${story.quran_gem.translation}` : ""}

Output MUST be raw valid JSON matching this schema with NO markdown wrapping:
{
  "title": "Quest: ${removeEmDashes(story.title.replace(/^Prophet\s+/i, 'Prophet '))}",
  "description": "Test what you learned about ${removeEmDashes(story.title)}!",
  "badge_title": "${removeEmDashes(story.hero_virtue ? `${story.hero_virtue.split(' ')[0]} Explorer` : `${story.title.split(':')[0]} Seeker`)}",
  "badge_description": "Mastered the story quest for ${removeEmDashes(story.title)}",
  "questions": [
    {
      "question_text": "...",
      "question_type": "single_choice",
      "options": [
        { "id": "o1", "text": "...", "is_correct": true },
        { "id": "o2", "text": "...", "is_correct": false },
        { "id": "o3", "text": "...", "is_correct": false },
        { "id": "o4", "text": "...", "is_correct": false }
      ],
      "explanation": "..."
    }
  ]
}`

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.8-flash"]
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
                temperature: 0.5,
                responseMimeType: "application/json",
              },
            }),
          },
        )

        if (!res.ok) {
          console.warn(`Gemini model ${model} failed (${res.status}), trying fallback...`)
          continue
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) continue

        const cleaned = text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim()
        const parsed = JSON.parse(cleaned) as GeneratedQuizData

        if (parsed.questions && parsed.questions.length >= 3) {
          quizData = {
            title: removeEmDashes(parsed.title || `Quest: ${story.title}`),
            description: removeEmDashes(parsed.description || `Test what you learned about ${story.title}!`),
            badge_title: removeEmDashes(parsed.badge_title || `${story.title.slice(0, 20)} Hero`),
            badge_description: removeEmDashes(parsed.badge_description || `Completed the quest for ${story.title}`),
            questions: parsed.questions.map((q) => ({
              question_text: removeEmDashes(q.question_text),
              question_type: "single_choice",
              options: ensureFourOptions(
                (q.options || []).map((o) => ({
                  ...o,
                  text: removeEmDashes(o.text),
                })),
              ),
              explanation: removeEmDashes(q.explanation || "Great effort reflecting on this story!"),
            })),
          }
          break
        }
      } catch (geminiErr) {
        console.warn(`Error generating quiz with ${model}:`, geminiErr)
      }
    }
  }

  // 5. Fallback generator if AI did not return a valid quiz
  if (!quizData) {
    const cleanTitle = story.title.toLowerCase()
    if (cleanTitle.includes("nuh") || cleanTitle.includes("ark")) {
      quizData = {
        title: "Quest: The Giant Ark of Nuh (AS)",
        description: "Test what you learned about Prophet Nuh's incredible patience!",
        badge_title: "Ark Navigator",
        badge_description: "Mastered the story of Prophet Nuh and the great Ark",
        questions: [
          {
            question_text: "For how many years did Prophet Nuh (AS) patiently invite his people to goodness?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "950 years", is_correct: true },
              { id: "o2", text: "40 years", is_correct: false },
              { id: "o3", text: "100 years", is_correct: false },
              { id: "o4", text: "10 years", is_correct: false },
            ],
            explanation: "Prophet Nuh's incredible patience for 950 years is a beacon of perseverance for us all!",
          },
          {
            question_text: "What phrase did Prophet Nuh say when embarking on the Ark?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Bismillahi majreeha wa mursaha", is_correct: true },
              { id: "o2", text: "Allahu Akbar", is_correct: false },
              { id: "o3", text: "Alhamdulillah", is_correct: false },
              { id: "o4", text: "Subhanallah", is_correct: false },
            ],
            explanation: "He sailed with the name of Allah, showing us to start all travels with Bismillah.",
          },
          {
            question_text: "What did the townspeople do when they saw Prophet Nuh building the Ark?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "They mocked him because there was no sea nearby", is_correct: true },
              { id: "o2", text: "They helped him build it", is_correct: false },
              { id: "o3", text: "They sailed it away", is_correct: false },
              { id: "o4", text: "They bought the wood", is_correct: false },
            ],
            explanation: "Even when people mocked him, Prophet Nuh never lost trust in Allah's promise.",
          },
          {
            question_text: "Where did Prophet Nuh's Ark safely come to rest after the great waters receded?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Mount Judi", is_correct: true },
              { id: "o2", text: "Mount Uhud", is_correct: false },
              { id: "o3", text: "Mount Sinai", is_correct: false },
              { id: "o4", text: "Mount Nur", is_correct: false },
            ],
            explanation: "As mentioned in Surah Hud, the Ark safely rested on Mount Judi by Allah's command.",
          },
          {
            question_text: "What lesson of character does Prophet Nuh's story teach us most?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Patience and steadfast faith even when others mock", is_correct: true },
              { id: "o2", text: "Giving up when tasks get difficult", is_correct: false },
              { id: "o3", text: "Building boats as a hobby", is_correct: false },
              { id: "o4", text: "Only helping those who are popular", is_correct: false },
            ],
            explanation: "Prophet Nuh exemplifies perseverance and unwavering trust in Allah despite adversity.",
          },
        ],
      }
    } else if (cleanTitle.includes("adam")) {
      quizData = {
        title: "Quest: Prophet Adam (AS)",
        description: "Test your knowledge on the first prophet and the power of Tawbah!",
        badge_title: "Garden Seeker",
        badge_description: "Mastered the story of Prophet Adam (AS)",
        questions: [
          {
            question_text: "Who was the very first prophet and human being created by Allah?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Prophet Adam (AS)", is_correct: true },
              { id: "o2", text: "Prophet Nuh (AS)", is_correct: false },
              { id: "o3", text: "Prophet Ibrahim (AS)", is_correct: false },
              { id: "o4", text: "Prophet Musa (AS)", is_correct: false },
            ],
            explanation: "Prophet Adam (AS) is the father of all humanity and the first messenger of Allah.",
          },
          {
            question_text: "What did Prophet Adam (AS) do immediately after making a mistake?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "He repented sincerely and asked Allah for forgiveness", is_correct: true },
              { id: "o2", text: "He blamed someone else", is_correct: false },
              { id: "o3", text: "He ignored it", is_correct: false },
              { id: "o4", text: "He became angry", is_correct: false },
            ],
            explanation: "Prophet Adam set the eternal example for all of us: when you make a mistake, turn to Allah in repentance.",
          },
          {
            question_text: "What special gift did Allah bestow upon Prophet Adam that impressed the angels?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "The knowledge of the names of all things", is_correct: true },
              { id: "o2", text: "Wings of gold", is_correct: false },
              { id: "o3", text: "The ability to fly", is_correct: false },
              { id: "o4", text: "A palace of silver", is_correct: false },
            ],
            explanation: "Allah taught Adam the names of all things, honoring him with knowledge and intellect.",
          },
          {
            question_text: "What did Prophet Adam (AS) immediately say after Allah blew the soul into him and he sneezed?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Alhamdulillah (All praise is due to Allah)", is_correct: true },
              { id: "o2", text: "Subhanallah", is_correct: false },
              { id: "o3", text: "Allahu Akbar", is_correct: false },
              { id: "o4", text: "Astaghfirullah", is_correct: false },
            ],
            explanation: "Prophet Adam's first words upon sneezing were Alhamdulillah, and Allah replied with mercy: Yarhamukallah.",
          },
          {
            question_text: "Why did Iblis refuse to bow down to Prophet Adam when Allah commanded the angels and jinn?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Arrogance and pride because he thought fire was superior to clay", is_correct: true },
              { id: "o2", text: "He did not hear the command", is_correct: false },
              { id: "o3", text: "He was too busy", is_correct: false },
              { id: "o4", text: "He forgot Allah's command", is_correct: false },
            ],
            explanation: "Iblis allowed pride and arrogance to blind him, refusing Allah's command out of haughtiness.",
          },
        ],
      }
    } else {
      // General story synthesis fallback
      quizData = {
        title: `Quest: ${removeEmDashes(story.title)}`,
        description: `Explore and test your knowledge of ${removeEmDashes(story.title)}!`,
        badge_title: `${story.hero_virtue ? story.hero_virtue.split(' ')[0] : "Story"} Champion`,
        badge_description: `Earned by mastering the quest for ${removeEmDashes(story.title)}!`,
        questions: [
          {
            question_text: `What is the central moral virtue highlighted in "${removeEmDashes(story.title)}"?`,
            question_type: "single_choice",
            options: [
              { id: "o1", text: story.hero_virtue || "Steadfast faith and good character", is_correct: true },
              { id: "o2", text: "Material wealth and worldly status", is_correct: false },
              { id: "o3", text: "Seeking fame and winning arguments", is_correct: false },
              { id: "o4", text: "Disregarding good advice from elders", is_correct: false },
            ],
            explanation: `The story centers upon ${story.hero_virtue || "practicing noble character and strong faith"}.`,
          },
          {
            question_text: "Why did Allah share inspiring stories in the Quran and Islamic history?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "To strengthen our hearts and guide our daily actions", is_correct: true },
              { id: "o2", text: "Merely for entertainment without moral lessons", is_correct: false },
              { id: "o3", text: "To keep historical dates memorized only", is_correct: false },
              { id: "o4", text: "Only for ancient people to read", is_correct: false },
            ],
            explanation: "Stories in the Quran and Islamic heritage guide our morals, character, and daily decisions.",
          },
          {
            question_text: "How can a young Muslim practice this story's lessons in everyday life?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "By doing the right thing with sincerity and kindness", is_correct: true },
              { id: "o2", text: "By being impatient when difficulties arise", is_correct: false },
              { id: "o3", text: "By ignoring people who need help", is_correct: false },
              { id: "o4", text: "By only thinking about ourselves", is_correct: false },
            ],
            explanation: "Practicing our faith means applying kindness, honesty, and patience wherever we are.",
          },
          {
            question_text: "When facing a difficult choice or test, what should our first reaction always be?",
            question_type: "single_choice",
            options: [
              { id: "o1", text: "Turn to Allah with Dua and do our best with patience", is_correct: true },
              { id: "o2", text: "Give up immediately and blame others", is_correct: false },
              { id: "o3", text: "Become angry and act without thinking", is_correct: false },
              { id: "o4", text: "Hide the problem and pretend nothing happened", is_correct: false },
            ],
            explanation: "Believers always anchor their hearts in Allah through prayer, patience, and sincere effort.",
          },
        ],
      }
    }
  }

  // 6. Insert new quiz into quizzes table (in Draft status)
  const { data: newQuiz, error: insertQuizError } = await admin
    .from("quizzes")
    .insert({
      title: quizData.title,
      description: quizData.description,
      category: quizCat,
      age_group: (story.target_age_group as QuizAgeGroup) || "all",
      passing_score: 80,
      badge_slug: `story_${topicSlug}`,
      badge_title: quizData.badge_title,
      badge_description: quizData.badge_description,
      is_published: false, // Draft for teacher review
    })
    .select("id, title, badge_title, is_published")
    .single()

  if (insertQuizError || !newQuiz) {
    console.error("Failed to insert quiz during regeneration:", insertQuizError)
    return NextResponse.json(
      { error: insertQuizError?.message || "Failed to create quiz" },
      { status: 500 },
    )
  }

  // 7. Insert Questions into quiz_questions
  const questionsToInsert = quizData.questions.map((q, idx) => ({
    quiz_id: newQuiz.id,
    question_text: q.question_text,
    question_type: q.question_type || "single_choice",
    options: ensureFourOptions(q.options),
    explanation: q.explanation || "Well done exploring this story!",
    order_index: idx + 1,
  }))

  const { error: insertQuestionsError } = await admin
    .from("quiz_questions")
    .insert(questionsToInsert)

  if (insertQuestionsError) {
    console.error("Failed to insert quiz questions:", insertQuestionsError)
  }

  // 8. Update story in islamic_history with new quiz_id
  const { error: linkError } = await admin
    .from("islamic_history")
    .update({ quiz_id: newQuiz.id })
    .eq("id", story.id)

  if (linkError) {
    console.error("Failed to update story with new quiz_id:", linkError)
  }

  return NextResponse.json({
    success: true,
    quiz_id: newQuiz.id,
    quiz: newQuiz,
    questions_count: questionsToInsert.length,
    message: `Story Quest Quiz created with ${questionsToInsert.length} questions!`,
  })
}
