-- Notifications RLS fix: stop teachers reading and writing everyone's feed.
-- Run this in the Supabase SQL Editor AFTER migration_notifications.sql.
--
-- The original "Teacher manage notifications" policy was FOR ALL, intended only
-- to let teachers CREATE announcements. But FOR ALL also covers SELECT/UPDATE/
-- DELETE, and Postgres ORs permissive policies together — so a teacher's read
-- predicate became `recipient_id = auth.uid() OR is_teacher()`, i.e. every row
-- in the table. Teachers saw students' notifications in their bell, and a
-- "mark all read" from a teacher cleared every recipient's unread state.
--
-- The policy grants nothing the app needs: every insert goes through the
-- service-role key (src/lib/notify.ts, /api/notifications), which bypasses RLS.
-- So we drop it outright and keep only the two self-scoped policies, leaving
-- `recipient_id = auth.uid()` as the single rule for reads and writes.

DROP POLICY IF EXISTS "Teacher manage notifications" ON notifications;

-- Re-assert the self-scoped policies so this file is safe to run standalone.
DROP POLICY IF EXISTS "Read own notifications" ON notifications;
CREATE POLICY "Read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Verify: expect exactly the two policies above, and no FOR ALL / INSERT /
-- DELETE policy. Anything else means a stale policy survived.
--
--   SELECT policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'notifications'
--   ORDER BY policyname;
