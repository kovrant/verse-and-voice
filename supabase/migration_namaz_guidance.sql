-- ─────────────────────────────────────────────────────────────────────────────
-- Namaz "Pray Along with Me": per-part guidance columns + seed
--
-- Adds to namaz_step_parts:
--   action_text   short kid instruction ("Bow down. Hands on knees. Back flat.")
--   word_tr       transliteration, ONE ENTRY PER ARABIC WORD of arabic_text
--                 (split on spaces, ayah markers ۝ skipped). The Arabic itself
--                 is never copied: the app pairs word_tr with the live
--                 arabic_text at render time and hides the chips if the counts
--                 stop matching (e.g. after a teacher edits the Arabic).
--   repeat_count  "Say it 3 times" (Ruku, Sujood)
--   audio_url     teacher recording (namaz-audio bucket, later migration)
--   word_timings  start second of each word, same length as word_tr
--   needs_review  true until the teacher approves the generated content
--   review_note   what the teacher should check
--
-- Never touches arabic_text or translation. Fixes the "Rabi Yal" spellings in
-- the Ruku / Sujood part titles. The seed matches on step + part title and only
-- fills parts whose word_tr is still empty, so it is safe to re-run and never
-- overwrites a teacher's edit. Run AFTER migration_namaz_translation.sql.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE namaz_step_parts
  ADD COLUMN IF NOT EXISTS action_text text,
  ADD COLUMN IF NOT EXISTS word_tr text[],
  ADD COLUMN IF NOT EXISTS repeat_count smallint CHECK (repeat_count IS NULL OR repeat_count > 0),
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS word_timings real[],
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_note text;

-- Spelling fixes (the title doubles as the pronunciation label).
UPDATE namaz_step_parts p SET title = 'Subhana Rabbiyal Azeem' FROM namaz_steps s
WHERE p.step_id = s.id AND s.title = 'Ruku' AND p.title = 'Subhana Rabi Yal Azeem';
UPDATE namaz_step_parts p SET title = 'Subhana Rabbiyal A''la' FROM namaz_steps s
WHERE p.step_id = s.id AND s.title = 'Sujood' AND p.title = 'Subhana Rabi Yal Ala';
UPDATE namaz_step_parts p SET title = 'Subhana Rabbiyal A''la' FROM namaz_steps s
WHERE p.step_id = s.id AND s.title = 'Second Sujood' AND p.title = 'Subhana Rabi Yal Ala';

WITH seed(step_title, part_title, action_text, word_tr, repeat_count, review_note) AS (
  VALUES
    ('Takbir', 'Takbir', 'Raise both hands to your ears.',
     ARRAY['Allahu', 'Akbar']::text[],
     NULL, 'Check action text.'),
    -- Same Takbir part under its title in migration_namaz_arabic.sql (fresh DBs).
    ('Takbir', 'Allah Hu Akbar', 'Raise both hands to your ears.',
     ARRAY['Allahu', 'Akbar']::text[],
     NULL, 'Check action text.'),
    ('Qiyam', 'Sana', 'Stand still, hands folded. Say it quietly.',
     ARRAY['Subhanaka', 'Allahumma', 'wa bihamdika', 'wa tabaraka', 'smuka', 'wa ta''ala', 'jadduka', 'wa la', 'ilaha', 'ghayruk']::text[],
     NULL, 'Check action text.'),
    ('Qiyam', 'Al-Fatiha', 'Keep standing. Recite Al-Fatiha.',
     ARRAY['Bismil-', 'lahir-', 'Rahmanir-', 'Rahim', 'Al-hamdu', 'lillahi', 'Rabbil-', '''alamin', 'Ar-Rahmanir-', 'Rahim', 'Maliki', 'yawmid-', 'din', 'Iyyaka', 'na''budu', 'wa iyyaka', 'nasta''in', 'Ihdinas-', 'siratal-', 'mustaqim', 'Siratal-', 'ladhina', 'an''amta', '''alayhim', 'ghayril-', 'maghdubi', '''alayhim', 'wa lad-', 'dallin']::text[],
     NULL, 'Check action text and how the words are split into chips.'),
    ('Qiyam', 'Al-Ikhlas', 'Still standing, recite a short surah.',
     ARRAY['Qul', 'huwa', 'Allahu', 'ahad', 'Allahus-', 'samad', 'Lam', 'yalid', 'wa lam', 'yulad', 'Wa lam', 'yakul-', 'lahu', 'kufuwan', 'ahad']::text[],
     NULL, 'Check action text and how the words are split into chips.'),
    ('Ruku', 'Subhana Rabbiyal Azeem', 'Bow down. Hands on knees. Back flat.',
     ARRAY['Subhana', 'Rabbiyal-', '''Azim']::text[],
     3, 'Check action text.'),
    ('Qawmah', 'Sami Allah', 'Rise up straight from bowing.',
     ARRAY['Sami''', 'Allahu', 'liman', 'hamidah']::text[],
     NULL, 'Check action text.'),
    ('Qawmah', 'Rabbana wa lakal Hamd', 'Stand tall, arms by your sides.',
     ARRAY['Rabbana', 'wa lakal-', 'hamdu', 'hamdan', 'kathiran', 'tayyiban', 'mubarakan', 'fih']::text[],
     NULL, 'Transliteration written by Claude: the stored Arabic is longer than ''Rabbana lakal-hamd''. Check it, and the action text.'),
    ('Sujood', 'Subhana Rabbiyal A''la', 'Forehead, nose, hands, knees and toes on the ground.',
     ARRAY['Subhana', 'Rabbiyal-', 'A''la']::text[],
     3, 'Check action text.'),
    ('Jalsa', 'Dua', 'Sit up calmly between the two sujood.',
     ARRAY['Allahumma', 'ghfir', 'li', 'warhamni', 'wahdini', 'wa''afini', 'warzuqni']::text[],
     NULL, 'Transliteration written by Claude. Check it, and the action text.'),
    ('Second Sujood', 'Subhana Rabbiyal A''la', 'Go down into sujood again.',
     ARRAY['Subhana', 'Rabbiyal-', 'A''la']::text[],
     3, 'Check action text.'),
    ('Tashahhud', 'Atahiyatu', 'Sit calmly, hands resting on your thighs.',
     ARRAY['At-tahiyyatu', 'lillahi', 'was-salawatu', 'wat-tayyibat', 'as-salamu', '''alayka', 'ayyuhan-', 'Nabiyyu', 'wa rahmatul-', 'lahi', 'wa barakatuh', 'as-salamu', '''alayna', 'wa ''ala', '''ibadil-', 'lahis-', 'salihin', 'ash-hadu', 'an', 'la', 'ilaha', 'illal-', 'lah', 'wa ash-hadu', 'anna', 'Muhammadan', '''abduhu', 'wa rasuluh']::text[],
     NULL, 'Check action text and how the words are split into chips.'),
    ('Tashahhud', 'Durood-e-Pak', 'Keep sitting. Send blessings on the Prophet ﷺ.',
     ARRAY['Allahumma', 'salli', '''ala', 'Muhammadin', 'wa ''ala', 'ali', 'Muhammadin', 'kama', 'sallayta', '''ala', 'Ibrahima', 'wa ''ala', 'ali', 'Ibrahima', 'innaka', 'Hamidun', 'Majid', 'Allahumma', 'barik', '''ala', 'Muhammadin', 'wa ''ala', 'ali', 'Muhammadin', 'kama', 'barakta', '''ala', 'Ibrahima', 'wa ''ala', 'ali', 'Ibrahima', 'innaka', 'Hamidun', 'Majid']::text[],
     NULL, 'Transliteration written by Claude. Check it, and the action text.'),
    ('Tashahhud', 'Last dua', 'Keep sitting and make this dua.',
     ARRAY['Allahumma', 'inni', 'zalamtu', 'nafsi', 'zulman', 'kathiran', 'wa la', 'yaghfirudh-', 'dhunuba', 'illa', 'anta', 'faghfir', 'li', 'maghfiratan', 'min', '''indika', 'warhamni', 'innaka', 'antal-', 'Ghafurur-', 'Rahim']::text[],
     NULL, 'Transliteration written by Claude. Check it, and the action text.'),
    ('Salam', 'Assalamu Alaikum', 'Turn your head to the right, then the left.',
     ARRAY['As-salamu', '''alaykum', 'wa rahmatul-', 'lah']::text[],
     NULL, 'Check action text.')
)
UPDATE namaz_step_parts p
SET action_text  = seed.action_text,
    word_tr      = seed.word_tr,
    repeat_count = seed.repeat_count,
    needs_review = true,
    review_note  = seed.review_note
FROM seed
JOIN namaz_steps s ON s.title = seed.step_title
WHERE p.step_id = s.id
  AND p.title = seed.part_title
  AND p.word_tr IS NULL;

-- Verify (read-only): every part should have a word_tr whose length equals the
-- Arabic word count (ayah markers excluded).
-- select s.title, p.title, cardinality(p.word_tr) as tr,
--        (select count(*) from unnest(string_to_array(p.arabic_text, ' ')) w where w <> '۝') as ar
-- from namaz_step_parts p join namaz_steps s on s.id = p.step_id
-- order by s.order_index, p.order_index;
