-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz Module Migration (IAM-10)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update achievement_definitions domain check if exists
DO $$
BEGIN
  ALTER TABLE achievement_definitions DROP CONSTRAINT IF EXISTS achievement_definitions_domain_check;
  ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_domain_check
    CHECK (domain IN ('quran', 'qaida', 'memorization', 'namaz', 'streak', 'quiz'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Quizzes Catalog
CREATE TABLE IF NOT EXISTS quizzes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  category          text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'seerah', 'prophets', 'quran', 'hadith', 'fiqh', 'events')),
  age_group         text NOT NULL DEFAULT 'all' CHECK (age_group IN ('5-8', '9-12', '13-16', 'all')),
  passing_score     integer NOT NULL DEFAULT 80,
  badge_slug        text NOT NULL,
  badge_title       text NOT NULL,
  badge_description text,
  is_published      boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON quizzes(is_published);

-- 3. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  text NOT NULL,
  question_type  text NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multi_choice', 'true_false')),
  options        jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of { id: string, text: string, is_correct: boolean }
  explanation    text,                               -- "Did you know?" learning fact
  order_index    integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);

-- 4. Quiz Assignments
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  assigned_at  timestamptz DEFAULT now(),
  due_date     timestamptz,
  UNIQUE (quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student ON quiz_assignments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);

-- 5. Quiz Attempts / Submissions
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id    uuid REFERENCES quiz_assignments(id) ON DELETE SET NULL,
  score            integer NOT NULL DEFAULT 0,
  total_questions  integer NOT NULL DEFAULT 0,
  percentage       integer NOT NULL DEFAULT 0,
  passed           boolean NOT NULL DEFAULT false,
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- 6. Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Allow reading published quizzes & questions
DROP POLICY IF EXISTS "quizzes_select_all" ON quizzes;
CREATE POLICY "quizzes_select_all" ON quizzes FOR SELECT USING (true);

DROP POLICY IF EXISTS "quiz_questions_select_all" ON quiz_questions;
CREATE POLICY "quiz_questions_select_all" ON quiz_questions FOR SELECT USING (true);

-- Allow reading and writing assignments
DROP POLICY IF EXISTS "quiz_assignments_select_all" ON quiz_assignments;
CREATE POLICY "quiz_assignments_select_all" ON quiz_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "quiz_assignments_all" ON quiz_assignments;
CREATE POLICY "quiz_assignments_all" ON quiz_assignments FOR ALL USING (true) WITH CHECK (true);

-- Allow reading and writing attempts
DROP POLICY IF EXISTS "quiz_attempts_select_all" ON quiz_attempts;
CREATE POLICY "quiz_attempts_select_all" ON quiz_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "quiz_attempts_insert_all" ON quiz_attempts;
CREATE POLICY "quiz_attempts_insert_all" ON quiz_attempts FOR ALL USING (true) WITH CHECK (true);

-- Allow admin full control on quizzes & questions
DROP POLICY IF EXISTS "quizzes_all" ON quizzes;
CREATE POLICY "quizzes_all" ON quizzes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_questions_all" ON quiz_questions;
CREATE POLICY "quiz_questions_all" ON quiz_questions FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Starter Quizzes
DO $$
DECLARE
  q1_id uuid;
  q2_id uuid;
  q3_id uuid;
BEGIN
  -- Quiz 1: 5 Pillars of Islam Quest (Ages 5-8)
  INSERT INTO quizzes (title, description, category, age_group, passing_score, badge_slug, badge_title, badge_description)
  VALUES (
    '5 Pillars of Islam Quest',
    'Embark on a fun journey to learn the five foundational pillars of Islam!',
    'general',
    '5-8',
    80,
    'badge_quiz_pillars_starter',
    'Pillars Explorer',
    'Mastered the 5 Pillars of Islam Quest'
  )
  RETURNING id INTO q1_id;

  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, explanation, order_index) VALUES
  (
    q1_id,
    'How many daily prayers (Salah) do Muslims perform each day?',
    'single_choice',
    '[{"id":"opt1","text":"3","is_correct":false},{"id":"opt2","text":"5","is_correct":true},{"id":"opt3","text":"7","is_correct":false},{"id":"opt4","text":"10","is_correct":false}]'::jsonb,
    'The 5 daily prayers are Fajr, Dhuhr, Asr, Maghrib, and Isha!',
    1
  ),
  (
    q1_id,
    'In which blessed Islamic month do Muslims fast from dawn to sunset?',
    'single_choice',
    '[{"id":"opt1","text":"Shawwal","is_correct":false},{"id":"opt2","text":"Muharram","is_correct":false},{"id":"opt3","text":"Ramadan","is_correct":true},{"id":"opt4","text":"Dhul Hijjah","is_correct":false}]'::jsonb,
    'Ramadan is the 9th month of the Islamic lunar calendar in which the Holy Quran was revealed.',
    2
  ),
  (
    q1_id,
    'What is the first Pillar of Islam?',
    'single_choice',
    '[{"id":"opt1","text":"Shahadah (Declaration of Faith)","is_correct":true},{"id":"opt2","text":"Zakat (Charity)","is_correct":false},{"id":"opt3","text":"Hajj (Pilgrimage)","is_correct":false},{"id":"opt4","text":"Sawm (Fasting)","is_correct":false}]'::jsonb,
    'Shahadah is declaring that there is no god worthy of worship except Allah and Prophet Muhammad (PBUH) is His Messenger.',
    3
  ),
  (
    q1_id,
    'Which holy city do Muslims travel to for performing Hajj?',
    'single_choice',
    '[{"id":"opt1","text":"Madinah","is_correct":false},{"id":"opt2","text":"Makkah","is_correct":true},{"id":"opt3","text":"Jerusalem","is_correct":false},{"id":"opt4","text":"Cairo","is_correct":false}]'::jsonb,
    'Makkah is where the sacred Kaaba is located, built by Prophet Ibrahim and Ismail (peace be upon them).',
    4
  ),
  (
    q1_id,
    'Zakat is giving a portion of your wealth to help the poor and needy. True or False?',
    'true_false',
    '[{"id":"opt1","text":"True","is_correct":true},{"id":"opt2","text":"False","is_correct":false}]'::jsonb,
    'Zakat purifies our wealth and spreads kindness and care throughout the community!',
    5
  );

  -- Quiz 2: Prophet Yunus (AS) and the Whale (Ages 9-12)
  INSERT INTO quizzes (title, description, category, age_group, passing_score, badge_slug, badge_title, badge_description)
  VALUES (
    'Prophet Yunus (AS) & The Whale',
    'Test your knowledge about the miraculous story of Prophet Yunus (AS) and his powerful Dua.',
    'prophets',
    '9-12',
    80,
    'badge_quiz_yunus_explorer',
    'Patience & Repentance Hero',
    'Mastered the story of Prophet Yunus (AS)'
  )
  RETURNING id INTO q2_id;

  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, explanation, order_index) VALUES
  (
    q2_id,
    'Which sea creature swallowed Prophet Yunus (AS) by the command of Allah?',
    'single_choice',
    '[{"id":"opt1","text":"A giant shark","is_correct":false},{"id":"opt2","text":"A giant whale / fish","is_correct":true},{"id":"opt3","text":"A sea turtle","is_correct":false},{"id":"opt4","text":"An octopus","is_correct":false}]'::jsonb,
    'Allah commanded the whale to swallow Yunus (AS) without harming his body or bones.',
    1
  ),
  (
    q2_id,
    'What did Prophet Yunus (AS) continuously recite inside the belly of the whale?',
    'single_choice',
    '[{"id":"opt1","text":"La ilaha illa Anta, Subhanaka inni kuntu minaz-zalimeen","is_correct":true},{"id":"opt2","text":"Alhamdulillah Rabbil Alameen","is_correct":false},{"id":"opt3","text":"SubhanAllahi wa bihamdihi","is_correct":false},{"id":"opt4","text":"Astaghfirullahal Azeem","is_correct":false}]'::jsonb,
    'This dua (Dua e Yunus) is one of the most powerful duas for anyone in distress or hardship!',
    2
  ),
  (
    q2_id,
    'To which ancient city was Prophet Yunus (AS) sent to guide his people?',
    'single_choice',
    '[{"id":"opt1","text":"Nineveh","is_correct":true},{"id":"opt2","text":"Babylon","is_correct":false},{"id":"opt3","text":"Damascus","is_correct":false},{"id":"opt4","text":"Yathrib","is_correct":false}]'::jsonb,
    'Prophet Yunus (AS) was sent to the people of Nineveh (in modern-day Iraq).',
    3
  ),
  (
    q2_id,
    'Which plant did Allah cause to grow over Prophet Yunus (AS) to provide him shade and nourishment after leaving the whale?',
    'single_choice',
    '[{"id":"opt1","text":"A date palm tree","is_correct":false},{"id":"opt2","text":"A gourd / pumpkin plant","is_correct":true},{"id":"opt3","text":"An olive tree","is_correct":false},{"id":"opt4","text":"A pomegranate bush","is_correct":false}]'::jsonb,
    'The Quran mentions that Allah caused a plant of gourd (Yaqteen) to grow over him to protect his tender skin.',
    4
  );

  -- Quiz 3: Ramadan & Fasting Adventure (All Ages)
  INSERT INTO quizzes (title, description, category, age_group, passing_score, badge_slug, badge_title, badge_description)
  VALUES (
    'Ramadan & Fasting Adventure',
    'A special quest covering the rules, virtues, and joyful traditions of Ramadan!',
    'events',
    'all',
    80,
    'badge_quiz_ramadan_master',
    'Ramadan Star Champion',
    'Mastered the Ramadan & Fasting Adventure Quiz'
  )
  RETURNING id INTO q3_id;

  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, explanation, order_index) VALUES
  (
    q3_id,
    'What is the pre-dawn meal called before beginning the fast?',
    'single_choice',
    '[{"id":"opt1","text":"Iftar","is_correct":false},{"id":"opt2","text":"Suhoor (Sehri)","is_correct":true},{"id":"opt3","text":"Walima","is_correct":false},{"id":"opt4","text":"Tahajjud","is_correct":false}]'::jsonb,
    'Prophet Muhammad (PBUH) taught that there is great barakah (blessing) in taking Suhoor.',
    1
  ),
  (
    q3_id,
    'What is the meal called when Muslims break their fast at sunset?',
    'single_choice',
    '[{"id":"opt1","text":"Suhoor","is_correct":false},{"id":"opt2","text":"Iftar","is_correct":true},{"id":"opt3","text":"Aqeeqah","is_correct":false},{"id":"opt4","text":"Brunch","is_correct":false}]'::jsonb,
    'It is Sunnah to break the fast with dates and fresh water while making dua.',
    2
  ),
  (
    q3_id,
    'Which special night in Ramadan is better than a thousand months?',
    'single_choice',
    '[{"id":"opt1","text":"Laylat al-Qadr (The Night of Decree)","is_correct":true},{"id":"opt2","text":"Laylat al-Miraj","is_correct":false},{"id":"opt3","text":"Laylat al-Baraat","is_correct":false},{"id":"opt4","text":"Chand Raat","is_correct":false}]'::jsonb,
    'Surah Al-Qadr states: Laylat al-Qadr is better than a thousand months (83+ years of worship)!',
    3
  ),
  (
    q3_id,
    'What joyous festival is celebrated immediately after the end of Ramadan?',
    'single_choice',
    '[{"id":"opt1","text":"Eid al-Adha","is_correct":false},{"id":"opt2","text":"Eid al-Fitr","is_correct":true},{"id":"opt3","text":"Mawlid","is_correct":false},{"id":"opt4","text":"Ashura","is_correct":false}]'::jsonb,
    'Eid al-Fitr begins with the sighting of the new moon of Shawwal, starting with Eid prayer and giving Zakat al-Fitr.',
    4
  );

END $$;
