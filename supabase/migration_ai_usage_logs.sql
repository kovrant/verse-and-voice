-- ─────────────────────────────────────────────────────────────────────────────
-- AI Usage Logs Migration
-- Tracks Google Gemini API calls, token counts, and daily quota consumption
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  teacher_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  feature            text NOT NULL DEFAULT 'quiz_generation',
  model              text NOT NULL DEFAULT 'gemini-2.0-flash',
  prompt_tokens      integer NOT NULL DEFAULT 0,
  completion_tokens  integer NOT NULL DEFAULT 0,
  total_tokens       integer NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'rate_limited', 'error', 'fallback')),
  topic              text,
  error_message      text
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_teacher ON ai_usage_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status ON ai_usage_logs(status);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- All app reads/writes use the service role (bypasses RLS); never open this to public/anon.
DROP POLICY IF EXISTS "ai_usage_logs_select" ON ai_usage_logs;
DROP POLICY IF EXISTS "ai_usage_logs_insert" ON ai_usage_logs;

DROP POLICY IF EXISTS "Teacher full access on ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Teacher full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL TO authenticated USING (is_teacher()) WITH CHECK (is_teacher());
