-- Notifications retention: keep only the last 2 months.
-- Run this in the Supabase SQL Editor AFTER migration_notifications.sql.
--
-- The app already hides anything older than 2 months from every feed (the
-- client filters on created_at). This migration does the *physical* cleanup so
-- the table doesn't grow forever: a daily pg_cron job deletes older rows.
--
-- pg_cron runs as the table owner, bypassing RLS — so it can delete rows for
-- every recipient. If the extension isn't available on your plan, enable it via
-- Dashboard → Database → Extensions (search "pg_cron"), then re-run this file.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- One-off cleanup of anything already older than the window.
DELETE FROM notifications WHERE created_at < now() - interval '2 months';

-- (Re)schedule the daily purge — drop the old schedule first so re-runs are safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-notifications') THEN
    PERFORM cron.unschedule('purge-old-notifications');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-old-notifications',
  '0 3 * * *', -- every day at 03:00 UTC
  $$ DELETE FROM notifications WHERE created_at < now() - interval '2 months' $$
);
