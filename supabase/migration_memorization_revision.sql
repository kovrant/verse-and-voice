-- Memorization revision bucket: completed items stay memorized; teacher assigns
-- revision per student via revision_assigned_at. Run in Supabase SQL Editor after
-- migration_memorization_chunks.sql.

ALTER TABLE student_memorization
  ADD COLUMN IF NOT EXISTS revision_assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_student_mem_revision_assigned
  ON student_memorization (student_id)
  WHERE status = 'memorized' AND revision_assigned_at IS NOT NULL;

-- Completion enters the revision bucket — do not stamp last_revised_at until the
-- teacher marks an actual revision.
CREATE OR REPLACE FUNCTION public.sync_memorization_status()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id uuid;
  v_catalog_id uuid;
  v_total int;
  v_done int;
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  SELECT catalog_id INTO v_catalog_id
    FROM memorization_chunks
    WHERE id = COALESCE(NEW.chunk_id, OLD.chunk_id);

  IF v_catalog_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_total
    FROM memorization_chunks WHERE catalog_id = v_catalog_id;

  SELECT count(*) INTO v_done
    FROM student_memorization_chunks smc
    JOIN memorization_chunks mc ON mc.id = smc.chunk_id
    WHERE smc.student_id = v_student_id AND mc.catalog_id = v_catalog_id;

  IF v_total = 0 THEN
    RETURN NULL;
  END IF;

  UPDATE student_memorization
    SET status = CASE WHEN v_done >= v_total THEN 'memorized' ELSE 'memorizing' END,
        revision_assigned_at = CASE
          WHEN v_done >= v_total THEN revision_assigned_at
          ELSE NULL
        END
    WHERE student_id = v_student_id AND catalog_id = v_catalog_id;

  RETURN NULL;
END;
$$;
