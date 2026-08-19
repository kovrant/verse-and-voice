-- Namaz module: step cards, sub-parts (duas), per-student assignment/unlock/revision, badges stub.
-- Run in Supabase SQL Editor AFTER migration_student_portal.sql.
--
-- Model:
--   * namaz_steps = shared card catalog (Takbir, Qiyam, …)
--   * namaz_step_parts = duas inside a step (Atahiyatu, Sana, …)
--   * student_namaz = teacher assigns module (sidebar hidden until row exists)
--   * student_namaz_steps = per-student step unlock + learning/revision progress
--   * student_namaz_parts = per-student part revision counts (teacher marks revised)
--   * badges / student_badges = completion award stub for upcoming trophy UI

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Shared step catalog
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS namaz_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  order_index int NOT NULL DEFAULT 0,
  image_url text,
  card_color text NOT NULL DEFAULT '#0d9488',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_namaz_steps_order ON namaz_steps(order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Parts inside a step (optional — Takbir may have none)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS namaz_step_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES namaz_steps(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (step_id, title)
);

CREATE INDEX IF NOT EXISTS idx_namaz_parts_step ON namaz_step_parts(step_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Student module assignment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_namaz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning', 'completed')),
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_revised_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_namaz_student ON student_namaz(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Per-student step progress
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_namaz_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES namaz_steps(id) ON DELETE CASCADE,
  unlocked_at timestamptz,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  revision_assigned_at timestamptz,
  last_revised_at timestamptz,
  revision_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_student_namaz_steps_student ON student_namaz_steps(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Per-student part revision tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_namaz_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES namaz_step_parts(id) ON DELETE CASCADE,
  revision_assigned_at timestamptz,
  last_revised_at timestamptz,
  revision_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_student_namaz_parts_student ON student_namaz_parts(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Badge stubs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  source text,
  UNIQUE (student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE namaz_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE namaz_step_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_namaz ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_namaz_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_namaz_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

-- namaz_steps: teachers manage; assigned students read all steps
DROP POLICY IF EXISTS "Teacher full access on namaz_steps" ON namaz_steps;
CREATE POLICY "Teacher full access on namaz_steps"
  ON namaz_steps FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read namaz_steps when assigned" ON namaz_steps;
CREATE POLICY "Student read namaz_steps when assigned"
  ON namaz_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_namaz sn
      WHERE sn.student_id = my_student_id()
    )
  );

-- namaz_step_parts: same pattern
DROP POLICY IF EXISTS "Teacher full access on namaz_step_parts" ON namaz_step_parts;
CREATE POLICY "Teacher full access on namaz_step_parts"
  ON namaz_step_parts FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read namaz_step_parts when assigned" ON namaz_step_parts;
CREATE POLICY "Student read namaz_step_parts when assigned"
  ON namaz_step_parts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_namaz sn
      WHERE sn.student_id = my_student_id()
    )
  );

-- student_namaz
DROP POLICY IF EXISTS "Teacher full access on student_namaz" ON student_namaz;
CREATE POLICY "Teacher full access on student_namaz"
  ON student_namaz FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_namaz" ON student_namaz;
CREATE POLICY "Student read own student_namaz"
  ON student_namaz FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- student_namaz_steps
DROP POLICY IF EXISTS "Teacher full access on student_namaz_steps" ON student_namaz_steps;
CREATE POLICY "Teacher full access on student_namaz_steps"
  ON student_namaz_steps FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_namaz_steps" ON student_namaz_steps;
CREATE POLICY "Student read own student_namaz_steps"
  ON student_namaz_steps FOR SELECT TO authenticated
  USING (student_id = my_student_id());

DROP POLICY IF EXISTS "Student update own student_namaz_steps view" ON student_namaz_steps;
CREATE POLICY "Student update own student_namaz_steps view"
  ON student_namaz_steps FOR UPDATE TO authenticated
  USING (student_id = my_student_id())
  WITH CHECK (student_id = my_student_id());

-- student_namaz_parts
DROP POLICY IF EXISTS "Teacher full access on student_namaz_parts" ON student_namaz_parts;
CREATE POLICY "Teacher full access on student_namaz_parts"
  ON student_namaz_parts FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_namaz_parts" ON student_namaz_parts;
CREATE POLICY "Student read own student_namaz_parts"
  ON student_namaz_parts FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- badges: shared read; teachers manage catalog
DROP POLICY IF EXISTS "Teacher full access on badges" ON badges;
CREATE POLICY "Teacher full access on badges"
  ON badges FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Authenticated read badges" ON badges;
CREATE POLICY "Authenticated read badges"
  ON badges FOR SELECT TO authenticated
  USING (true);

-- student_badges
DROP POLICY IF EXISTS "Teacher full access on student_badges" ON student_badges;
CREATE POLICY "Teacher full access on student_badges"
  ON student_badges FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_badges" ON student_badges;
CREATE POLICY "Student read own student_badges"
  ON student_badges FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Seed default steps, parts, and completion badge
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO namaz_steps (title, order_index, card_color) VALUES
  ('Takbir', 0, '#0d9488'),
  ('Qiyam', 1, '#2563eb'),
  ('Ruku', 2, '#7c3aed'),
  ('Qawmah', 3, '#db2777'),
  ('Sujood', 4, '#ea580c'),
  ('Jalsa', 5, '#ca8a04'),
  ('Second Sujood', 6, '#dc2626'),
  ('Tashahhud', 7, '#0891b2'),
  ('Salam', 8, '#16a34a')
ON CONFLICT (title) DO NOTHING;

INSERT INTO namaz_step_parts (step_id, title, order_index)
SELECT s.id, p.title, p.order_index
FROM namaz_steps s
JOIN (VALUES
  ('Qiyam', 'Sana', 0),
  ('Qiyam', 'Al-Fatiha', 1),
  ('Qiyam', 'Al-Ikhlas', 2),
  ('Tashahhud', 'Atahiyatu', 0),
  ('Tashahhud', 'Durood-e-Pak', 1),
  ('Tashahhud', 'Last dua', 2)
) AS p(step_title, title, order_index) ON s.title = p.step_title
ON CONFLICT (step_id, title) DO NOTHING;

INSERT INTO badges (slug, title, description) VALUES
  ('namaz_complete', 'Namaz Master', 'Completed learning all Namaz steps')
ON CONFLICT (slug) DO NOTHING;
