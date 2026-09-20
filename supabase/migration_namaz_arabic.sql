-- ─────────────────────────────────────────────────────────────────────────────
-- Namaz parts: Arabic text
--
-- Each part of a step (Sana, Al-Fatiha, Atahiyatu, …) can carry the Arabic a
-- child recites. The student portal shows it under the part title; the teacher
-- editor can add or correct it.
--
-- The seed below fills the well-known texts for the parts that ship with the
-- app. It matches on step + part title and only writes when arabic_text is
-- still empty, so it is safe to re-run and never overwrites a teacher's edit.
-- Apply in the Supabase SQL editor (see README for the order).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE namaz_step_parts ADD COLUMN IF NOT EXISTS arabic_text text;

-- Seed: step title / part title → Arabic
WITH seed(step_title, part_title, arabic) AS (
  VALUES
    ('Takbir', 'Allah Hu Akbar', 'اللَّهُ أَكْبَرُ'),
    ('Qiyam', 'Sana',
     'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ'),
    ('Qiyam', 'Al-Fatiha',
     'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ'),
    ('Qiyam', 'Al-Ikhlas',
     'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ'),
    ('Ruku', 'Subhana Rabi Yal Azeem', 'سُبْحَانَ رَبِّيَ الْعَظِيمِ'),
    ('Qawmah', 'Sami Allah', 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ'),
    ('Sujood', 'Subhana Rabi Yal Ala', 'سُبْحَانَ رَبِّيَ الْأَعْلَى'),
    ('Jalsa', 'Dua', 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي'),
    ('Second Sujood', 'Subhana Rabi Yal Ala', 'سُبْحَانَ رَبِّيَ الْأَعْلَى'),
    ('Tashahhud', 'Atahiyatu',
     'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ'),
    ('Tashahhud', 'Durood-e-Pak',
     'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ'),
    ('Tashahhud', 'Last dua',
     'اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ وَارْحَمْنِي، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ')
)
UPDATE namaz_step_parts p
SET arabic_text = seed.arabic
FROM seed
JOIN namaz_steps s ON s.title = seed.step_title
WHERE p.step_id = s.id
  AND p.title = seed.part_title
  AND (p.arabic_text IS NULL OR p.arabic_text = '');
