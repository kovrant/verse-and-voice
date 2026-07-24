-- Notifications: durable, per-recipient notifications delivered in real time.
-- Run this in the Supabase SQL Editor AFTER migration_student_portal.sql.
--
-- Model:
--   * One row per notification, addressed to a single `recipient_id`
--     (an auth.users id). Works for BOTH teacher and student recipients.
--   * The recipient's browser reads them live via Realtime Postgres Changes
--     (filtered to recipient_id), so they appear instantly and survive reloads
--     (unlike the ephemeral Broadcast used for live classes).
--   * Everyone reads + marks-read only their OWN rows (RLS). Teachers may create
--     notifications for anyone. Programmatic senders (/api/notifications) use the
--     service-role key, which bypasses RLS — same trust model as /api/activity.

CREATE TABLE IF NOT EXISTS notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text NOT NULL DEFAULT 'announcement',
  title          text NOT NULL,
  body           text,
  link           text,                                     -- in-app path to open, e.g. '/student/classes'
  priority       text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  read_at        timestamptz,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients read their own feed.
DROP POLICY IF EXISTS "Read own notifications" ON notifications;
CREATE POLICY "Read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- Recipients may update their own rows (only ever used to set read_at).
DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Teachers can create/manage any notification (compose announcements).
DROP POLICY IF EXISTS "Teacher manage notifications" ON notifications;
CREATE POLICY "Teacher manage notifications"
  ON notifications FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_time
  ON notifications(recipient_id, created_at DESC);

-- Enable Realtime so clients can subscribe to Postgres Changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
