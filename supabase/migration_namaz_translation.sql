-- ─────────────────────────────────────────────────────────────────────────────
-- Namaz parts: English translation
--
-- The student Namaz screen shows each part's Arabic large, with its meaning in
-- English underneath, so a child knows what they are saying. The teacher
-- editor can add or correct it.
--
-- The seed fills the well-known meanings for the parts that ship with the app.
-- Like migration_namaz_arabic.sql, it matches on step + part title and only
-- writes when translation is still empty: safe to re-run, and it never
-- overwrites a teacher's edit. Run AFTER migration_namaz_arabic.sql (it
-- translates the Qawmah and Salam parts that migration inserts).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE namaz_step_parts ADD COLUMN IF NOT EXISTS translation text;

WITH seed(step_title, part_title, translation) AS (
  VALUES
    ('Takbir', 'Allah Hu Akbar',
     'Allah is the Greatest.'),
    ('Qiyam', 'Sana',
     'Glory be to You, O Allah, and all praise is Yours. Blessed is Your Name, and high is Your Majesty. There is no god but You.'),
    ('Qiyam', 'Al-Fatiha',
     'In the name of Allah, the Most Kind, the Most Merciful. All praise is for Allah, Lord of all the worlds, the Most Kind, the Most Merciful, Master of the Day of Judgement. You alone we worship, and You alone we ask for help. Guide us on the straight path: the path of those You have blessed, not of those who earned Your anger, nor of those who went astray.'),
    ('Qiyam', 'Al-Ikhlas',
     'Say: He is Allah, the One. Allah, Who needs no one while everyone needs Him. He has no children, and He was not born. And there is no one like Him.'),
    ('Ruku', 'Subhana Rabi Yal Azeem',
     'Glory be to my Lord, the Most Great.'),
    ('Qawmah', 'Sami Allah',
     'Allah hears the one who praises Him.'),
    ('Qawmah', 'Rabbana wa lakal Hamd',
     'Our Lord, all praise is Yours: a lot of praise, pure and full of blessing.'),
    ('Sujood', 'Subhana Rabi Yal Ala',
     'Glory be to my Lord, the Most High.'),
    ('Jalsa', 'Dua',
     'O Allah, forgive me, have mercy on me, guide me, keep me safe and well, and give me what I need.'),
    ('Second Sujood', 'Subhana Rabi Yal Ala',
     'Glory be to my Lord, the Most High.'),
    ('Tashahhud', 'Atahiyatu',
     'All greetings, prayers and good words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the good servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and His Messenger.'),
    ('Tashahhud', 'Durood-e-Pak',
     'O Allah, send Your blessings on Muhammad and the family of Muhammad, as You sent blessings on Ibrahim and the family of Ibrahim. You are truly Praiseworthy and Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. You are truly Praiseworthy and Glorious.'),
    ('Tashahhud', 'Last dua',
     'O Allah, I have wronged myself a lot, and no one forgives sins except You. So forgive me with Your forgiveness, and have mercy on me. You are truly the Most Forgiving, the Most Merciful.'),
    ('Salam', 'Assalamu Alaikum',
     'Peace be upon you, and the mercy of Allah.')
)
UPDATE namaz_step_parts p
SET translation = seed.translation
FROM seed
JOIN namaz_steps s ON s.title = seed.step_title
WHERE p.step_id = s.id
  AND p.title = seed.part_title
  AND (p.translation IS NULL OR p.translation = '');

-- Verify (read-only): every part and whether it has a translation yet.
-- select s.order_index, s.title as step, p.title as part,
--        p.translation is not null and p.translation <> '' as translated
-- from namaz_step_parts p join namaz_steps s on s.id = p.step_id
-- order by s.order_index, p.order_index;
