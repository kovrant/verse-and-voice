import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import {
  CURATED_ISLAMIC_TOPICS,
  getCanvaDreamLabPrompt,
  type LifeLesson,
  normalizeTopicSlug,
  type QuranGem,
} from "@/lib/history"
import type { QuizAgeGroup, QuizCategory } from "@/lib/quizzes/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface GenerateStoryRequestBody {
  topic?: string
  target_age_group?: "5-8" | "9-12" | "13-16" | "all"
  category?: string
  hijri_month?: number | null
  custom_instructions?: string
}

interface GeneratedQuizQuestion {
  question_text: string
  question_type: "single_choice" | "true_false"
  options: { id: string; text: string; is_correct: boolean }[]
  explanation: string
}

interface GeneratedStoryResponse {
  title: string
  arabic_title: string
  subtitle: string
  hero_virtue: string
  reading_time_mins: number
  summary: string
  content: string
  quran_gem: QuranGem
  life_lessons: LifeLesson[]
  reflection_challenge: string
  cover_prompt: string
  derived_quiz: {
    title: string
    description: string
    badge_title: string
    badge_description: string
    questions: GeneratedQuizQuestion[]
  }
}

const ALLOWED_AGE_GROUPS = new Set(["5-8", "9-12", "13-16", "all"])
const ALLOWED_CATEGORIES = new Set([
  "Prophets",
  "Companions",
  "Battles",
  "Events",
  "Places",
  "Other",
])

export async function POST(request: Request) {
  const { user, denied } = await requireTeacher()
  if (denied) return denied

  let body: GenerateStoryRequestBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rawTopic = typeof body.topic === "string" ? body.topic : "Prophet Adam (AS)"
  const topic =
    rawTopic
      .replace(/[\r\n"`\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) || "Prophet Adam (AS)"

  const ageGroup =
    body.target_age_group && ALLOWED_AGE_GROUPS.has(body.target_age_group)
      ? body.target_age_group
      : "9-12"

  const category =
    body.category && ALLOWED_CATEGORIES.has(body.category)
      ? body.category
      : "Prophets"

  const hijriMonth =
    typeof body.hijri_month === "number" && body.hijri_month >= 1 && body.hijri_month <= 12
      ? body.hijri_month
      : null

  const customInstructions =
    typeof body.custom_instructions === "string" ? body.custom_instructions.trim().slice(0, 300) : ""

  const topicSlug = normalizeTopicSlug(topic)
  const admin = createSupabaseAdminClient()

  // 1. Duplication Prevention (safe against schema variants)
  try {
    const { data: existingStories, error: searchError } = await admin
      .from("islamic_history")
      .select("id, title, is_published, category")
      .ilike("title", `%${topic}%`)
      .limit(1)

    if (!searchError && existingStories && existingStories.length > 0) {
      const match = existingStories[0]
      const suggestions = CURATED_ISLAMIC_TOPICS.filter(
        (c) => c.topic_slug !== topicSlug,
      ).slice(0, 3)

      return NextResponse.json(
        {
          error: `A story for "${match.title}" already exists in Islamic History (${
            match.is_published ? "Published" : "Draft"
          }). To keep the library shelf unique and diverse, please choose a fresh topic!`,
          is_duplicate: true,
          existing_story: match,
          suggestions,
        },
        { status: 409 },
      )
    }
  } catch (dupErr) {
    console.warn("Duplication check query error (continuing):", dupErr)
  }

  // 2. AI Generation via Gemini
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  let generatedData: GeneratedStoryResponse | null = null
  let successfulModel = "gemini-3.5-flash"
  let tokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  if (apiKey) {
    const masterPrompt = `You are a world-class Islamic educator and children's storybook author specializing in authentic, conclude-and-reflect Islamic history for young minds.
Your task is to craft an inspiring, kid-friendly Islamic history story based on the authentic Quran and Sunnah, adhering strictly to "The 5-Part Kid Storybook Anatomy".

Topic: "${topic}"
Target Age Group: "${ageGroup}" (Ages 5-8 = gentle, simple words; Ages 9-12 = vivid adventure and moral choices; Ages 13-16 = historical context and deep character building).
Category: "${category}"
${customInstructions ? `Additional Teacher Note: "${customInstructions}"` : ""}

Follow these structural requirements with utmost precision:
1. 🌟 The Wonder Opening (summary):
   - 2-3 sentences. A curiosity hook that immediately captivates kids without dry dates or textbook lecturing.
2. 📖 The Adventure (content):
   - Markdown format with exactly 3 episodic scenes formatted as:
     ### Scene 1: [Catchy Scene Title]
     [Narrative text...]
     ### Scene 2: [Catchy Scene Title]
     [Narrative text...]
     ### Scene 3: [Catchy Scene Title]
     [Narrative text...]
   - Use vivid sensory details, emotional warmth, and child-relatable dialogue.
   - Strictly authentic narrative in line with Quran and authentic Hadith (no mythical exaggerations).
   - Inspires deep love and respect for Allah and His righteous servants.
3. 💎 The Quranic Gem Card (quran_gem):
   - Featured authentic Ayah from the Quran directly linked to the story.
   - surah_number: integer
   - surah_name: string (e.g. "Surah Al-A'raf")
   - ayah_number: string (e.g. "7:23")
   - arabic: authentic Arabic text with full tashkeel/diacritics.
   - translation: accessible, clear English translation suitable for kids (in the style of The Clear Quran for Kids).
   - child_takeaway: 1 inspiring takeaway sentence explaining why Allah shared this Ayah with us.
4. 🧭 The Moral Compass (life_lessons):
   - Array of exactly 3 practical lessons tailored to a child's everyday world:
     - { "context": "At School & With Friends", "emoji": "🏫", "lesson": "..." }
     - { "context": "At Home with Family", "emoji": "🏡", "lesson": "..." }
     - { "context": "In My Heart & Prayers", "emoji": "💖", "lesson": "..." }
5. 🎯 The Explorer Challenge (reflection_challenge):
   - A 1-2 sentence reflection pledge or practical action the child can do today.
6. 🎨 Canva AI / Dream Lab Cover Art Prompt (cover_prompt):
   - A descriptive, imaginative text prompt tailored for Canva AI Dream Lab / Magic Media to generate a Pixar/DreamWorks 3D children's storybook cover illustration.
   - STRICT ISLAMIC RULE: Never depict the face or physical form of Prophets or Angels. Use majestic symbolic nature, celestial skies, luminous lanterns, historic architectural landscapes, or radiant gardens.
   - Specify style: "Disney Pixar 3D animated storybook concept art, warm volumetric golden lighting, rich vibrant colors, highly detailed, 16:9 cinematic aspect ratio. No human faces, scenic only."
7. 🏆 Directly Derived Mini-Quest Quiz (derived_quiz):
   - Generate 3 to 4 multiple-choice questions directly derived from the story content.
   - title: e.g. "Quest: Prophet Adam (AS)"
   - description: e.g. "Test your explorer knowledge on the story!"
   - badge_title: e.g. "Garden Explorer"
   - badge_description: e.g. "Completed the Prophet Adam Story Quest"
   - questions: 3 to 4 items, each with:
     - question_text: string
     - question_type: "single_choice"
     - options: 4 options [{ "id": "o1", "text": "...", "is_correct": true }, ...] (exactly 1 is_correct: true)
     - explanation: 1 "Did you know?" fact based on the story.

Output MUST be raw valid JSON strictly matching this schema with NO markdown wrapping, codeblocks, or extra text:
{
  "title": "Inspiring Title for Kids",
  "arabic_title": "الاسم بالعربية",
  "subtitle": "Engaging subtitle capturing the heart of the story",
  "hero_virtue": "The core moral virtue (e.g. Sincere Apology & Repentance)",
  "reading_time_mins": 4,
  "summary": "The wonder hook...",
  "content": "### Scene 1: ...\\n\\n### Scene 2: ...\\n\\n### Scene 3: ...",
  "quran_gem": {
    "surah_number": 7,
    "surah_name": "Surah Al-A'raf",
    "ayah_number": "7:23",
    "arabic": "قَالَا رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    "translation": "They pleaded: 'Our Lord! We have wronged ourselves. If You do not forgive us and have mercy upon us, we will certainly be among the losers.'",
    "child_takeaway": "When we make a mistake, saying sorry right away to Allah and others turns sadness into forgiveness and love."
  },
  "life_lessons": [
    {
      "context": "At School & With Friends",
      "emoji": "🏫",
      "lesson": "..."
    },
    {
      "context": "At Home with Family",
      "emoji": "🏡",
      "lesson": "..."
    },
    {
      "context": "In My Heart & Prayers",
      "emoji": "💖",
      "lesson": "..."
    }
  ],
  "reflection_challenge": "The next time I make a mistake today, I will pause, say 'Astaghfirullah', and apologize sincerely!",
  "cover_prompt": "Lush, magical ancient gardens of Paradise with radiant golden sunlight streaming through giant weeping emerald willow trees, crystal-clear flowing streams of water, vibrant exotic flowers and gentle glowing butterflies, peaceful celestial atmosphere, Pixar 3D animated movie style, digital children's storybook illustration, rich volumetric lighting, cinematic wide landscape composition, 8k, warm and enchanting. No human faces or figures, scenic nature only.",
  "derived_quiz": {
    "title": "Story Quest Quiz",
    "description": "Short description",
    "badge_title": "Badge Name",
    "badge_description": "Earned for completing this quest",
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
  }
}`

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.8-flash"]

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: masterPrompt }] }],
              generationConfig: {
                temperature: 0.35,
                responseMimeType: "application/json",
              },
            }),
          },
        )

        if (res.ok) {
          const data = await res.json()
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            generatedData = JSON.parse(rawText) as GeneratedStoryResponse
            successfulModel = model
            const meta = data?.usageMetadata || {}
            tokenUsage = {
              prompt_tokens: Number(meta.promptTokenCount) || 0,
              completion_tokens: Number(meta.candidatesTokenCount) || 0,
              total_tokens: Number(meta.totalTokenCount) || 0,
            }
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
  }

  // Fallback to rich template if Gemini is unavailable or failed
  if (!generatedData) {
    generatedData = getFallbackStory(topic, category, ageGroup)
    successfulModel = "offline_template"
  }

  // Log usage into ai_usage_logs
  try {
    await admin.from("ai_usage_logs").insert({
      teacher_id: user?.id || null,
      feature: "history_story_generation",
      model: successfulModel,
      prompt_tokens: tokenUsage.prompt_tokens,
      completion_tokens: tokenUsage.completion_tokens,
      total_tokens: tokenUsage.total_tokens,
      status: successfulModel === "offline_template" ? "fallback" : "success",
      topic,
    })
  } catch (logErr) {
    console.warn("Failed to log ai_usage to database:", logErr)
  }

  // Map category to quiz category
  const quizCategoryMap: Record<string, QuizCategory> = {
    Prophets: "prophets",
    Companions: "seerah",
    Battles: "events",
    Events: "events",
    Places: "general",
    Other: "general",
  }
  const quizCat: QuizCategory = quizCategoryMap[category] || "prophets"

  // 3. Create Linked Quiz in Draft mode
  let createdQuizId: string | null = null
  let createdQuiz = null

  if (generatedData.derived_quiz && generatedData.derived_quiz.questions?.length > 0) {
    try {
      const { data: newQuiz, error: quizError } = await admin
        .from("quizzes")
        .insert({
          title: generatedData.derived_quiz.title || `${generatedData.title} Quest`,
          description:
            generatedData.derived_quiz.description ||
            `Test your knowledge on the story of ${generatedData.title}.`,
          category: quizCat,
          age_group: (ageGroup as QuizAgeGroup) || "all",
          passing_score: 80,
          badge_slug: `story_${topicSlug}`,
          badge_title: generatedData.derived_quiz.badge_title || `${generatedData.title} Hero`,
          badge_description:
            generatedData.derived_quiz.badge_description ||
            `Earned by finishing the story quest for ${generatedData.title}!`,
          is_published: false, // Draft until teacher reviews & publishes!
        })
        .select("id, title, badge_title")
        .single()

      if (!quizError && newQuiz) {
        createdQuizId = newQuiz.id
        createdQuiz = newQuiz

        // Insert Questions
        const questionsToInsert = generatedData.derived_quiz.questions.map((q, idx) => ({
          quiz_id: newQuiz.id,
          question_text: q.question_text,
          question_type: q.question_type || "single_choice",
          options: q.options,
          explanation: q.explanation || "Well done exploring this story!",
          order_index: idx + 1,
        }))

        await admin.from("quiz_questions").insert(questionsToInsert)
      }
    } catch (quizInsErr) {
      console.warn("Failed to insert derived quiz into quizzes table:", quizInsErr)
    }
  }

  // 4. Create Islamic History Story in Draft mode
  try {
    const { data: createdStory, error: storyError } = await admin
      .from("islamic_history")
      .insert({
        title: generatedData.title,
        arabic_title: generatedData.arabic_title || null,
        subtitle: generatedData.subtitle || null,
        topic_slug: topicSlug,
        summary: generatedData.summary,
        content: generatedData.content,
        category,
        target_age_group: ageGroup,
        hero_virtue: generatedData.hero_virtue,
        reading_time_mins: generatedData.reading_time_mins || 4,
        quran_gem: generatedData.quran_gem,
        life_lessons: generatedData.life_lessons,
        reflection_challenge: generatedData.reflection_challenge,
        cover_prompt: generatedData.cover_prompt || getCanvaDreamLabPrompt(generatedData),
        quiz_id: createdQuizId,
        hijri_month: hijriMonth,
        is_published: false, // Saved as draft for teacher review!
      })
      .select("*")
      .single()

    let storyRecord = createdStory
    let schemaNotice: string | undefined

    if (storyError) {
      console.warn("V2 story insert encountered schema mismatch, retrying with base columns:", storyError)
      // Retry with baseline columns if migration_islamic_history_v2.sql has not been run yet
      const { data: baseStory, error: baseError } = await admin
        .from("islamic_history")
        .insert({
          title: generatedData.title,
          arabic_title: generatedData.arabic_title || null,
          summary: generatedData.summary,
          content: generatedData.content,
          category,
          hijri_month: hijriMonth,
          is_published: false,
        })
        .select("*")
        .single()

      if (baseError || !baseStory) {
        throw baseError || storyError
      }

      storyRecord = baseStory
      schemaNotice = "Story saved! Run migration_islamic_history_v2.sql in Supabase SQL editor to enable the Quran Gem card & derived quiz."
    }

    return NextResponse.json({
      success: true,
      story: storyRecord,
      quiz: createdQuiz,
      source: successfulModel === "offline_template" ? "offline_template" : "gemini_ai",
      model: successfulModel,
      notice: schemaNotice,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create story"
    console.error("Failed to save generated story:", err)
    return NextResponse.json(
      { error: errorMsg || "Failed to save story draft" },
      { status: 500 },
    )
  }
}

// Fallback high-quality template generator for key Islamic topics
function getFallbackStory(
  topic: string,
  _category: string,
  _ageGroup: string,
): GeneratedStoryResponse {
  const clean = topic.toLowerCase()

  if (clean.includes("nuh") || clean.includes("ark")) {
    return {
      title: "Prophet Nuh (AS): The Giant Ark of Hope & 950 Years of Patience",
      arabic_title: "نوح عليه السلام",
      subtitle: "How building an ark on dry land taught the world to trust Allah's promise",
      hero_virtue: "Patience & Perseverance (Sabr)",
      reading_time_mins: 4,
      summary:
        "Imagine spending hundreds of years calling people to love Allah, even when they laughed at you. Discover how Prophet Nuh built a gigantic ship in the desert and rescued the righteous!",
      content: `### Scene 1: A Voice of Kindness in the Desert
For 950 years, Prophet Nuh (AS) spoke to his people with love, kindness, and gentle reminders. But many people put their fingers in their ears and turned away. Despite this, Prophet Nuh never gave up hope and never stopped praying for them.

### Scene 2: The Ark on the Sand
Allah commanded Prophet Nuh to build a colossal wooden ark. The townspeople walked by and mocked him: "A ship with no ocean in sight?" With every wooden plank and iron nail, Prophet Nuh smiled with firm faith, knowing Allah's promise is always true.

### Scene 3: The Rain That Cleansed the Earth
When the heavens opened and pure water gushed from the earth, pairs of peaceful animals and believers boarded the Ark. As the waves rose as high as mountains, the Ark floated safely under Allah's watchful care, carrying a brand new beginning for the world.`,
      quran_gem: {
        surah_number: 11,
        surah_name: "Surah Hud",
        ayah_number: "11:41",
        arabic: "وَقَالَ ارْكَبُوا فِيهَا بِسْمِ اللَّهِ مَجْرَاهَا وَمُرْسَاهَا ۚ إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ",
        translation:
          "And he said: 'Embark upon it! In the Name of Allah is its sailing and its mooring. Truly my Lord is All-Forgiving, Most Merciful.'",
        child_takeaway:
          "Whenever we begin a journey, a test, or a task, saying 'Bismillah' places us directly under Allah's loving protection.",
      },
      life_lessons: [
        {
          context: "At School & With Friends",
          emoji: "🏫",
          lesson:
            "When doing the right thing feels unpopular or other kids laugh, hold your head high and stay kind just like Prophet Nuh.",
        },
        {
          context: "At Home with Family",
          emoji: "🏡",
          lesson:
            "Practice patience (Sabr) when chores or studies take effort. Great things take time and dedication.",
        },
        {
          context: "In My Heart & Prayers",
          emoji: "💖",
          lesson:
            "Begin every car ride, bike ride, and school morning with 'Bismillah' to invite peace and safety.",
        },
      ],
      reflection_challenge:
        "Today, whenever I step into the car or start my homework, I will say 'Bismillahi majreeha wa mursaha' with a grateful heart!",
      cover_prompt:
        "A colossal, majestic handcrafted wooden ark resting on the peak of a misty mountaintop as dark storm clouds part into a glorious golden sunrise and vibrant rainbow over the calm receding blue ocean, Disney Pixar 3D storybook concept art, warm heroic atmospheric lighting, cinematic 16:9, highly detailed wood texture, uplifting and hopeful. No human faces, epic scenery only.",
      derived_quiz: {
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
        ],
      },
    }
  }

  // Default: Prophet Adam (AS)
  return {
    title: "Prophet Adam (AS): The Beginning & The Power of Sincere Apology",
    arabic_title: "آدم عليه السلام",
    subtitle: "How the very first human taught us mankind's greatest superpower: Sincere Tawbah",
    hero_virtue: "Repentance & Humility (Tawbah & Istighfar)",
    reading_time_mins: 4,
    summary:
      "Ever wonder who was the first person to ever walk on earth? Discover the wonder of Prophet Adam, the special gifts Allah gave him, and the powerful secret of saying 'I am sorry'.",
    content: `### Scene 1: The First Breath and The Name of Things
Before humans existed, Allah created Prophet Adam from the earth and blew a soul of life into him. Allah taught Adam the names and secrets of all things—from the birds soaring in the sky to the sweetest fruits in the gardens. Even the angels bowed in awe of the knowledge Allah bestowed upon him.

### Scene 2: The Whispering Tree
In the peaceful gardens of Paradise, Prophet Adam and Lady Hawwa lived in tranquility. Allah permitted them to enjoy everything, except one specific tree. But Iblis, jealous of Adam's honor, whispered sweet lies and tricked them into tasting from it. Immediately, Adam felt deep remorse and sorrow in his heart.

### Scene 3: The Greatest Superpower: Saying Sorry
Unlike Iblis who was arrogant and stubborn, Prophet Adam immediately turned to Allah with tears and humility. Allah gently taught Adam the beautiful words of apology: *"Our Lord, we have wronged ourselves..."* Allah accepted his prayer instantly, showing that every human mistake can be wiped clean with a sincere heart.`,
    quran_gem: {
      surah_number: 7,
      surah_name: "Surah Al-A'raf",
      ayah_number: "7:23",
      arabic: "قَالَا رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
      translation:
        "They pleaded: 'Our Lord! We have wronged ourselves. If You do not forgive us and have mercy upon us, we will certainly be among the losers.'",
      child_takeaway:
        "When we make a mistake, saying sorry right away to Allah and others turns sadness into forgiveness and love.",
    },
    life_lessons: [
      {
        context: "At School & With Friends",
        emoji: "🏫",
        lesson:
          "If you accidentally bump into a friend or say something unkind, apologize quickly without making excuses.",
      },
      {
        context: "At Home with Family",
        emoji: "🏡",
        lesson:
          "When parents correct you, remember that admitting mistakes is a sign of courage and strength, not weakness.",
      },
      {
        context: "In My Heart & Prayers",
        emoji: "💖",
        lesson:
          "Say 'Astaghfirullah' every day. Allah loves people who turn back to Him with humble hearts.",
      },
    ],
    reflection_challenge:
      "Today, if I make even a tiny mistake, I will immediately say 'I am sorry' and 'Astaghfirullah' with a smile!",
    cover_prompt:
      "Lush, magical ancient gardens of Paradise with radiant golden sunlight streaming through giant weeping emerald willow trees, crystal-clear flowing streams of water, vibrant exotic flowers and gentle glowing butterflies, peaceful celestial atmosphere, Pixar 3D animated movie style, digital children's storybook illustration, rich volumetric lighting, cinematic wide landscape composition, 8k, warm and enchanting. No human faces or figures, scenic nature only.",
    derived_quiz: {
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
      ],
    },
  }
}
