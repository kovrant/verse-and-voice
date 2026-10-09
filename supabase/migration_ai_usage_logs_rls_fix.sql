-- AI usage logs RLS fix. Run AFTER migration_ai_usage_logs.sql. Idempotent.
--
-- The original policies had no TO clause and USING/WITH CHECK (true), so they
-- applied to `public` (incl. `anon`). The anon key ships in the browser bundle,
-- so anyone could read every log row and insert fake rows to skew the quota
-- meter. Every app read/write goes through the service role (bypasses RLS), so
-- we drop the open policies and keep a teacher-only one.

DROP POLICY IF EXISTS "ai_usage_logs_select" ON ai_usage_logs;
DROP POLICY IF EXISTS "ai_usage_logs_insert" ON ai_usage_logs;

DROP POLICY IF EXISTS "Teacher full access on ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Teacher full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL TO authenticated USING (is_teacher()) WITH CHECK (is_teacher());
