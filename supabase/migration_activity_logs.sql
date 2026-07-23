-- Activity logs: capture every student interaction in the portal.
-- Run this in the Supabase SQL Editor AFTER migration_student_portal.sql.
--
-- Model:
--   * One row per interaction (page view, link click, generic click, para open,
--     PDF page turn, …).
--   * Rows are written server-side by /api/activity using the service-role key,
--     which derives student_id from the authenticated session (so a student
--     can't forge another student's id). Because of that, students need NO
--     direct table privileges — only the teacher reads the feed.
--   * `occurred_at` is the client-side timestamp of the event (authoritative for
--     ordering the timeline); `created_at` is the DB insertion time (audit).

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,          -- 'page_view' | 'link_click' | 'click' | 'para_open' | 'pdf_page'
  path text,                         -- pathname when the event fired
  label text,                        -- link / button text, para name, etc.
  href text,                         -- destination (for link clicks / navigations)
  meta jsonb NOT NULL DEFAULT '{}',  -- { para_number, page, tag, x, y, user_agent, ... }
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Teacher reads the whole feed. No student policy on purpose: writes go through
-- the service-role key in the API route, which bypasses RLS.
DROP POLICY IF EXISTS "Teacher read activity_logs" ON activity_logs;
CREATE POLICY "Teacher read activity_logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (is_teacher());

-- Indexes for the per-student timeline and event-type filtering.
CREATE INDEX IF NOT EXISTS idx_activity_logs_student_time
  ON activity_logs(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type
  ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_occurred_at
  ON activity_logs(occurred_at DESC);
