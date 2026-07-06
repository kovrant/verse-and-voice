-- Migration: Add class_sessions table
-- Stores a record of each completed live class session.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  starting_para integer,
  ending_para integer,
  paras_covered integer[] NOT NULL DEFAULT '{}',
  memorization_revised text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Default permissive policy (matches the other tables before auth is enabled).
-- migration_auth_rls.sql tightens this to authenticated-only.
DROP POLICY IF EXISTS "Allow all on class_sessions" ON class_sessions;
CREATE POLICY "Allow all on class_sessions" ON class_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_class_sessions_student ON class_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_student_started
  ON class_sessions(student_id, started_at DESC);
