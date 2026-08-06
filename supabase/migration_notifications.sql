-- Notifications: durable, per-recipient notifications delivered in real time.
-- Run this in the Supabase SQL Editor AFTER migration_student_portal.sql.
--
-- Model:
--   * One row per notification, addressed to a single `recipient_id`
--     (an auth.users id). Works for BOTH teacher and student recipients.
--   * The recipient's browser reads them live via Realtime Postgres Changes
--     (filtered to recipient_id), so they appear instantly and survive reloads
--     (unlike the ephemeral Broadcast used for live classes).
--   * Everyone — teacher or student — reads and marks-read only their OWN rows
--     (RLS). Senders (/api/notifications, src/lib/notify.ts) use the service-role
--     key, which bypasses RLS — same trust model as /api/activity.

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

-- No policy grants access to anyone else's rows — not even teachers. Every
-- insert is made with the service-role key (src/lib/notify.ts and the
-- /api/notifications route), which bypasses RLS, so a teacher-wide policy would
-- buy nothing and would leak every recipient's feed to every teacher.
-- See migration_notifications_rls_fix.sql for the incident this replaced.

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
