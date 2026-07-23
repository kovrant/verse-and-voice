-- Islamic History: a teacher-managed knowledge library of Islamic history,
-- events, prophets, and companions that students can read in their portal.
--
-- Model:
--   * Shared reference content (like `memorization_catalog` / `media_library`):
--       - Teachers get full CRUD.
--       - Students get READ-ONLY access to PUBLISHED rows only.
--   * Each story is "mixed" content: a Markdown article body PLUS optional
--     attached media (a cover image and/or a PDF/document).
--   * Stories may be tagged to a Hijri month (1-12) so the student portal can
--     auto-feature the current month's content (e.g. Rabi-ul-Awwal → the
--     Prophet ﷺ). `hijri_month = NULL` means evergreen (always browsable).
--
-- Requires: migration_student_portal.sql (for the is_teacher() and
--           my_student_id() SECURITY DEFINER helper functions).
--
-- Storage: attached files reuse the existing `memorization-images` bucket,
--          whose teacher-write / all-authenticated-read policies are already
--          defined in migration_student_portal.sql — no new bucket needed.
--
-- Run this in the Supabase SQL Editor AFTER migration_student_portal.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS islamic_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  arabic_title     text,                 -- optional, rendered RTL with <ArabicText>
  summary          text,                 -- short blurb for cards / month banner
  content          text,                 -- main article body (Markdown)
  category         text NOT NULL DEFAULT 'Event'
                   CHECK (category IN ('Prophets','Companions','Battles','Events','Places','Other')),
  hijri_month      smallint CHECK (hijri_month BETWEEN 1 AND 12), -- NULL = evergreen
  cover_image_url  text,                 -- optional cover image
  file_url         text,                 -- optional attached PDF / document
  file_type        text CHECK (file_type IN ('pdf','image','doc')), -- type of file_url
  is_published     boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for the student portal queries (filter by month / category,
-- and only ever show published rows).
CREATE INDEX IF NOT EXISTS islamic_history_month_idx
  ON islamic_history (hijri_month) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS islamic_history_category_idx
  ON islamic_history (category) WHERE is_published = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Keep updated_at fresh on every UPDATE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_islamic_history_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS islamic_history_set_updated_at ON islamic_history;
CREATE TRIGGER islamic_history_set_updated_at
  BEFORE UPDATE ON islamic_history
  FOR EACH ROW EXECUTE FUNCTION public.set_islamic_history_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
--    Teachers: full CRUD.   Students: read PUBLISHED rows only.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE islamic_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on islamic_history" ON islamic_history;
CREATE POLICY "Teacher full access on islamic_history"
  ON islamic_history FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read published islamic_history" ON islamic_history;
CREATE POLICY "Student read published islamic_history"
  ON islamic_history FOR SELECT TO authenticated
  USING (my_student_id() IS NOT NULL AND is_published = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. (Optional) A couple of starter rows so the portal isn't empty.
--    Safe to delete this block — teachers can add content from the portal.
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO islamic_history (title, arabic_title, summary, content, category, hijri_month)
-- VALUES
--   ('The Birth of Prophet Muhammad ﷺ',
--    'مولد النبي محمد ﷺ',
--    'Born in the Year of the Elephant, in the month of Rabiʿ al-Awwal, in Makkah.',
--    E'## The Year of the Elephant\n\nProphet Muhammad ﷺ was born in Makkah...',
--    'Prophets', 3),
--   ('The Hijrah to Madinah',
--    'الهجرة إلى المدينة',
--    'The migration of the Prophet ﷺ that marks the start of the Islamic calendar.',
--    E'## The Migration\n\nThe Hijrah took place in the month of...',
--    'Events', 1);
