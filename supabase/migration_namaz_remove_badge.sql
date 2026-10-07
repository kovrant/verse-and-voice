-- ─────────────────────────────────────────────────────────────────────────────
-- Namaz: no badges, no certificates
--
-- /student/namaz is an open guide any signed-in student can read; nothing is
-- assigned or awarded. Removes the unused `namaz_complete` ("Namaz Master")
-- definition. On 2026-10-07 the live DB had 0 earned rows and 0 certificates
-- for it; the deletes below clear any that appear before this runs.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM student_certificates
WHERE achievement_id IN (SELECT id FROM achievement_definitions WHERE domain = 'namaz');

DELETE FROM student_achievements
WHERE achievement_id IN (SELECT id FROM achievement_definitions WHERE domain = 'namaz');

DELETE FROM achievement_definitions WHERE domain = 'namaz';
