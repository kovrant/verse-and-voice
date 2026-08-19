-- Enable Supabase Realtime (Postgres Changes) for Namaz student progress tables.
-- Run in Supabase SQL Editor AFTER migration_namaz_steps.sql.
-- Without this, student unlock/revision updates only appear on manual refresh.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'student_namaz',
    'student_namaz_steps',
    'student_namaz_parts'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;
