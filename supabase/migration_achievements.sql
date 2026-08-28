-- Achievement badges for Quran, Qaida, and (with dynamic slugs) memorization.
-- Requires badges + student_badges from migration_namaz_steps.sql.

INSERT INTO badges (slug, title, description) VALUES
  ('qaida_complete', 'Qaida Graduate', 'Completed Norani Qaida'),
  ('quran_half', 'Halfway There', 'Completed 15 paras of the Quran'),
  ('quran_khatm', 'Khatm', 'Completed a full reading of the Quran')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO badges (slug, title, description)
SELECT
  'para_' || lpad(n::text, 2, '0'),
  'Para ' || n,
  'Completed Para ' || n || ' of the Quran'
FROM generate_series(1, 30) AS n
ON CONFLICT (slug) DO NOTHING;
