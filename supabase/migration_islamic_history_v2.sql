-- ─────────────────────────────────────────────────────────────────────────────
-- Islamic History V2: Kid Storybook Anatomy & Derived Quests
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend islamic_history table with structured storybook attributes
ALTER TABLE islamic_history
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS topic_slug TEXT,
  ADD COLUMN IF NOT EXISTS target_age_group TEXT DEFAULT 'all' CHECK (target_age_group IN ('5-8', '9-12', '13-16', 'all')),
  ADD COLUMN IF NOT EXISTS hero_virtue TEXT, -- e.g. 'Patience (Sabr)', 'Honesty (Sidq)', 'Courage (Shuja`ah)'
  ADD COLUMN IF NOT EXISTS reading_time_mins INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS quran_gem JSONB DEFAULT '{}'::jsonb, -- { surah_number, surah_name, ayah_number, arabic, translation, child_takeaway }
  ADD COLUMN IF NOT EXISTS life_lessons JSONB DEFAULT '[]'::jsonb, -- Array of { context, emoji, lesson }
  ADD COLUMN IF NOT EXISTS reflection_challenge TEXT,
  ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_islamic_history_topic_slug 
  ON islamic_history(topic_slug) 
  WHERE topic_slug IS NOT NULL;

-- 2. Student reading progress & reflection pledge tracking
CREATE TABLE IF NOT EXISTS student_story_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  story_id            UUID NOT NULL REFERENCES islamic_history(id) ON DELETE CASCADE,
  completed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reflection_pledged  BOOLEAN NOT NULL DEFAULT false,
  quiz_attempt_id     UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_student_story_progress_student 
  ON student_story_progress(student_id);

CREATE INDEX IF NOT EXISTS idx_student_story_progress_story 
  ON student_story_progress(story_id);

ALTER TABLE student_story_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_story_progress_select" ON student_story_progress;
CREATE POLICY "student_story_progress_select" 
  ON student_story_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "student_story_progress_upsert" ON student_story_progress;
CREATE POLICY "student_story_progress_upsert" 
  ON student_story_progress FOR ALL USING (true) WITH CHECK (true);
