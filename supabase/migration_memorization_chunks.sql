-- Chunked memorization: let a catalog item (e.g. "Dua e Qanoot") be broken into
-- ordered pieces that a student memorizes one at a time. Run this in the Supabase
-- SQL Editor AFTER migration_student_portal.sql.
--
-- Model:
--   * memorization_catalog stays the "whole" item. Its image_url is the overview
--     image (the full Dua) shown as the goal.
--   * memorization_chunks = the ordered pieces of an item (shared reference,
--     like the catalog). Each chunk has one image.
--   * student_memorization_chunks = which chunks a given student has memorized.
--   * The item's overall status in student_memorization is DERIVED: it flips to
--     'memorized' only once the student has memorized every chunk (see trigger).
--
-- Backward compatible: an item with ZERO chunks behaves exactly as before —
-- the teacher toggles student_memorization.status directly. No data migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Chunks: ordered pieces of a catalog item (shared reference content)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memorization_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES memorization_catalog(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,  -- controls sequence; UI labels as "Part N"
  label text,                          -- optional override, e.g. "First 2 words"
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mem_chunks_catalog
  ON memorization_chunks(catalog_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Per-student chunk progress
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_memorization_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES memorization_chunks(id) ON DELETE CASCADE,
  memorized_at timestamptz DEFAULT now(),
  UNIQUE (student_id, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_student_mem_chunks_student
  ON student_memorization_chunks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mem_chunks_chunk
  ON student_memorization_chunks(chunk_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Derive the item-level status from chunk progress.
--    When chunk progress changes for a student, recompute their
--    student_memorization.status for the affected catalog item:
--      * item has chunks AND all are memorized -> 'memorized'
--      * item has chunks but not all memorized -> 'memorizing'
--      * item has NO chunks -> left untouched (teacher-driven, as before)
--    Only runs if the student is actually assigned the item (row exists).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_memorization_status()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id uuid;
  v_catalog_id uuid;
  v_total int;
  v_done int;
BEGIN
  -- Resolve the affected (student, catalog item) from the changed chunk row.
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  SELECT catalog_id INTO v_catalog_id
    FROM memorization_chunks
    WHERE id = COALESCE(NEW.chunk_id, OLD.chunk_id);

  IF v_catalog_id IS NULL THEN
    RETURN NULL;  -- chunk was deleted along with its catalog item; nothing to do
  END IF;

  SELECT count(*) INTO v_total
    FROM memorization_chunks WHERE catalog_id = v_catalog_id;

  SELECT count(*) INTO v_done
    FROM student_memorization_chunks smc
    JOIN memorization_chunks mc ON mc.id = smc.chunk_id
    WHERE smc.student_id = v_student_id AND mc.catalog_id = v_catalog_id;

  IF v_total = 0 THEN
    RETURN NULL;  -- unchunked item -> teacher controls status manually
  END IF;

  UPDATE student_memorization
    SET status = CASE WHEN v_done >= v_total THEN 'memorized' ELSE 'memorizing' END,
        last_revised_at = now()
    WHERE student_id = v_student_id AND catalog_id = v_catalog_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mem_status ON student_memorization_chunks;
CREATE TRIGGER trg_sync_mem_status
  AFTER INSERT OR DELETE ON student_memorization_chunks
  FOR EACH ROW EXECUTE FUNCTION public.sync_memorization_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — teachers manage everything; students read only their own progress
--    and the shared chunk list (matches the memorization_catalog policies).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE memorization_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_memorization_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on memorization_chunks" ON memorization_chunks;
CREATE POLICY "Teacher full access on memorization_chunks"
  ON memorization_chunks FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
DROP POLICY IF EXISTS "Student read chunks" ON memorization_chunks;
CREATE POLICY "Student read chunks"
  ON memorization_chunks FOR SELECT TO authenticated
  USING (my_student_id() IS NOT NULL);

DROP POLICY IF EXISTS "Teacher full access on student_memorization_chunks" ON student_memorization_chunks;
CREATE POLICY "Teacher full access on student_memorization_chunks"
  ON student_memorization_chunks FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
DROP POLICY IF EXISTS "Student read own memorization_chunks" ON student_memorization_chunks;
CREATE POLICY "Student read own memorization_chunks"
  ON student_memorization_chunks FOR SELECT TO authenticated
  USING (student_id = my_student_id());
