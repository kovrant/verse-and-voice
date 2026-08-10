-- One-off copy fix: replace the em dash in the stored "class is live" body.
-- Run this in the Supabase SQL Editor.
--
-- src/lib/notify.ts now writes "Your teacher started the class. Tap to join."
-- but the body text is denormalised onto every row at insert time, so rows
-- already in the table keep the old wording until they're rewritten here.

UPDATE notifications
SET body = 'Your teacher started the class. Tap to join.'
WHERE type = 'live_class'
  AND body = 'Your teacher started the class — tap to join.';

-- Catch any other stored notification copy carrying an em dash. Teacher-composed
-- announcements are excluded: that text was typed by a human and is theirs.
UPDATE notifications
SET body = replace(body, ' — ', '. ')
WHERE type <> 'announcement'
  AND body LIKE '%—%';

-- Verify: expect zero rows.
--
--   SELECT id, type, title, body FROM notifications
--   WHERE (body LIKE '%—%' OR title LIKE '%—%') AND type <> 'announcement';
