-- Unified achievements module: definitions, earned records, certificates.
-- Replaces badges + student_badges. Run AFTER migration_achievements.sql on live DBs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catalog — every badge/certificate the app can award
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  domain              text NOT NULL CHECK (domain IN ('quran', 'qaida', 'memorization', 'namaz', 'streak')),
  kind                text NOT NULL DEFAULT 'badge' CHECK (kind IN ('badge', 'certificate')),
  title               text NOT NULL,
  description         text,
  image_url           text,
  issues_certificate  boolean NOT NULL DEFAULT false,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievement_definitions_domain ON achievement_definitions(domain);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Earned achievements (badges + certificate-eligible milestones)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_achievements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id  uuid NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  earned_at       timestamptz DEFAULT now(),
  source          text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  UNIQUE (student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Issued certificates (major milestones only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_certificates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id      uuid NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  student_achievement_id uuid REFERENCES student_achievements(id) ON DELETE SET NULL,
  certificate_number  text NOT NULL UNIQUE,
  issued_at           timestamptz DEFAULT now(),
  metadata            jsonb NOT NULL DEFAULT '{}',
  UNIQUE (student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_certificates_student ON student_certificates(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Migrate legacy badges → achievement_definitions (if old tables exist)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'badges') THEN
    INSERT INTO achievement_definitions (slug, domain, kind, title, description, image_url, issues_certificate, created_at)
    SELECT
      b.slug,
      CASE
        WHEN b.slug = 'qaida_complete' THEN 'qaida'
        WHEN b.slug = 'namaz_complete' THEN 'namaz'
        WHEN b.slug LIKE 'mem_%' THEN 'memorization'
        WHEN b.slug IN ('quran_half', 'quran_khatm') OR b.slug LIKE 'para_%' OR b.slug LIKE 'khatm_%' THEN 'quran'
        ELSE 'quran'
      END,
      'badge',
      b.title,
      b.description,
      b.image_url,
      b.slug IN ('qaida_complete', 'quran_khatm') OR b.slug LIKE 'khatm_%',
      b.created_at
    FROM badges b
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO student_achievements (student_id, achievement_id, earned_at, source)
    SELECT
      sb.student_id,
      ad.id,
      sb.earned_at,
      sb.source
    FROM student_badges sb
    JOIN badges b ON b.id = sb.badge_id
    JOIN achievement_definitions ad ON ad.slug = b.slug
    ON CONFLICT (student_id, achievement_id) DO NOTHING;

    -- Backfill certificate rows for major milestones already earned
    INSERT INTO student_certificates (student_id, achievement_id, student_achievement_id, certificate_number, metadata)
    SELECT
      sa.student_id,
      sa.achievement_id,
      sa.id,
      'VV-' || to_char(sa.earned_at, 'YYYY') || '-' ||
        upper(regexp_replace(ad.slug, '[^a-z0-9]+', '-', 'gi')) || '-' ||
        upper(substr(replace(sa.student_id::text, '-', ''), 1, 6)),
      jsonb_build_object('slug', ad.slug, 'migrated', true)
    FROM student_achievements sa
    JOIN achievement_definitions ad ON ad.id = sa.achievement_id
    WHERE ad.issues_certificate = true
    ON CONFLICT (student_id, achievement_id) DO NOTHING;

    DROP TABLE IF EXISTS student_badges;
    DROP TABLE IF EXISTS badges;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed catalog (idempotent — skipped rows already migrated above)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO achievement_definitions (slug, domain, kind, title, description, issues_certificate) VALUES
  ('namaz_complete', 'namaz', 'badge', 'Namaz Master', 'Completed learning all Namaz steps', true),
  ('qaida_complete', 'qaida', 'certificate', 'Qaida Graduate', 'Completed Norani Qaida', true),
  ('quran_half', 'quran', 'badge', 'Halfway There', 'Completed 15 paras of the Quran', false),
  ('quran_khatm', 'quran', 'certificate', 'Khatm', 'Completed a full reading of the Quran', true)
ON CONFLICT (slug) DO UPDATE SET
  issues_certificate = EXCLUDED.issues_certificate,
  kind = EXCLUDED.kind;

INSERT INTO achievement_definitions (slug, domain, kind, title, description, issues_certificate)
SELECT
  'para_' || lpad(n::text, 2, '0'),
  'quran',
  'badge',
  'Para ' || n,
  'Completed Para ' || n || ' of the Quran',
  false
FROM generate_series(1, 30) AS n
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on achievement_definitions" ON achievement_definitions;
CREATE POLICY "Teacher full access on achievement_definitions"
  ON achievement_definitions FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Authenticated read achievement_definitions" ON achievement_definitions;
CREATE POLICY "Authenticated read achievement_definitions"
  ON achievement_definitions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teacher full access on student_achievements" ON student_achievements;
CREATE POLICY "Teacher full access on student_achievements"
  ON student_achievements FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_achievements" ON student_achievements;
CREATE POLICY "Student read own student_achievements"
  ON student_achievements FOR SELECT TO authenticated
  USING (student_id = my_student_id());

DROP POLICY IF EXISTS "Teacher full access on student_certificates" ON student_certificates;
CREATE POLICY "Teacher full access on student_certificates"
  ON student_certificates FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own student_certificates" ON student_certificates;
CREATE POLICY "Student read own student_certificates"
  ON student_certificates FOR SELECT TO authenticated
  USING (student_id = my_student_id());
