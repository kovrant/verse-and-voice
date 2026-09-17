-- ─────────────────────────────────────────────────────────────────────────────
-- Hadith Module Migration (IAM-11)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update achievement_definitions domain check to include 'hadith'
DO $$
BEGIN
  ALTER TABLE achievement_definitions DROP CONSTRAINT IF EXISTS achievement_definitions_domain_check;
  ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_domain_check
    CHECK (domain IN ('quran', 'qaida', 'memorization', 'namaz', 'streak', 'quiz', 'hadith'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Hadiths Catalog
CREATE TABLE IF NOT EXISTS hadiths (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hadith_number     integer NOT NULL UNIQUE,
  topic             text NOT NULL DEFAULT 'general' CHECK (topic IN ('manners', 'knowledge', 'kindness', 'purity', 'family', 'prayer', 'truthfulness', 'general')),
  arabic_text       text NOT NULL,
  english_text      text NOT NULL,
  urdu_text         text NOT NULL,
  narrator          text,
  reference         text NOT NULL,
  kids_lesson       text NOT NULL,
  order_index       integer NOT NULL DEFAULT 0,
  is_published      boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hadiths_topic ON hadiths(topic);
CREATE INDEX IF NOT EXISTS idx_hadiths_order ON hadiths(order_index);
CREATE INDEX IF NOT EXISTS idx_hadiths_is_published ON hadiths(is_published);

-- 3. Student Hadith Progress
CREATE TABLE IF NOT EXISTS student_hadith_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hadith_id      uuid NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'memorizing', 'memorized')),
  memorized_at   timestamptz,
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(student_id, hadith_id)
);

CREATE INDEX IF NOT EXISTS idx_student_hadith_progress_student ON student_hadith_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_hadith_progress_hadith ON student_hadith_progress(hadith_id);
CREATE INDEX IF NOT EXISTS idx_student_hadith_progress_status ON student_hadith_progress(status);

-- 4. Hadith Assignments (Hadith of the Week)
CREATE TABLE IF NOT EXISTS hadith_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hadith_id      uuid NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  assigned_at    timestamptz DEFAULT now(),
  due_date       timestamptz,
  UNIQUE(hadith_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_hadith_assignments_student ON hadith_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_hadith_assignments_hadith ON hadith_assignments(hadith_id);
CREATE INDEX IF NOT EXISTS idx_hadith_assignments_status ON hadith_assignments(status);

-- 5. Row Level Security (RLS)
ALTER TABLE hadiths ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_hadith_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hadith_assignments ENABLE ROW LEVEL SECURITY;

-- Hadiths: Anyone authenticated can read published hadiths; teachers manage
DROP POLICY IF EXISTS "Anyone can view published hadiths" ON hadiths;
CREATE POLICY "Anyone can view published hadiths"
  ON hadiths FOR SELECT
  TO authenticated
  USING (is_published = true OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Teachers can manage hadiths" ON hadiths;
CREATE POLICY "Teachers can manage hadiths"
  ON hadiths FOR ALL
  TO authenticated
  USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    OR coalesce((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'teacher'
    OR auth.role() = 'service_role'
  );

-- Student Hadith Progress: Students view/update own; teachers full view
DROP POLICY IF EXISTS "Students view own hadith progress" ON student_hadith_progress;
CREATE POLICY "Students view own hadith progress"
  ON student_hadith_progress FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    OR coalesce((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'teacher'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Students manage own hadith progress" ON student_hadith_progress;
CREATE POLICY "Students manage own hadith progress"
  ON student_hadith_progress FOR ALL
  TO authenticated
  USING (
    student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    OR coalesce((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'teacher'
    OR auth.role() = 'service_role'
  );

-- Hadith Assignments: Students view own; teachers manage
DROP POLICY IF EXISTS "Students view own hadith assignments" ON hadith_assignments;
CREATE POLICY "Students view own hadith assignments"
  ON hadith_assignments FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    OR coalesce((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'teacher'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Teachers manage hadith assignments" ON hadith_assignments;
CREATE POLICY "Teachers manage hadith assignments"
  ON hadith_assignments FOR ALL
  TO authenticated
  USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    OR coalesce((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'teacher'
    OR auth.role() = 'service_role'
  );

-- 6. Pre-Seeded 40 Short Authentic Hadiths for Kids
INSERT INTO hadiths (hadith_number, topic, arabic_text, english_text, urdu_text, narrator, reference, kids_lesson, order_index)
VALUES
(1, 'knowledge', 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', 'The best of you are those who learn the Quran and teach it.', 'تم میں سے بہترین شخص وہ ہے جو قرآن سیکھے اور سکھائے۔', 'Uthman ibn Affan (RA)', 'Sahih al-Bukhari 5027', 'Learn a verse of the Quran every single day and teach it to a friend or sibling!', 1),
(2, 'kindness', 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ', 'Smiling at your brother is an act of charity.', 'اپنے بھائی کے سامنے مسکرانا تمہارے لیے صدقہ ہے۔', 'Abu Dharr (RA)', 'Jami` at-Tirmidhi 1956', 'Share a warm, cheerful smile with everyone you meet today.', 2),
(3, 'purity', 'الطُّهُورُ شَطْرُ الإِيمَانِ', 'Cleanliness and purity is half of faith.', 'پاکیزگی اور صفائی نصف ایمان ہے۔', 'Abu Malik al-Ash`ari (RA)', 'Sahih Muslim 223', 'Keep your body, clothes, room, and heart clean and pure!', 3),
(4, 'knowledge', 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ', 'Seeking knowledge is an obligation upon every Muslim.', 'علم حاصل کرنا ہر مسلمان پر فرض ہے۔', 'Anas ibn Malik (RA)', 'Sunan Ibn Majah 224', 'Be curious and learn something beneficial every day for Allah’s pleasure.', 4),
(5, 'kindness', 'مَنْ لَا يَرْحَمْ لَا يُرْحَمْ', 'Whoever does not show mercy will not receive mercy.', 'جو دوسروں پر رحم نہیں کرتا، اس پر بھی رحم نہیں کیا جائے گا۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 5997', 'Be gentle, loving, and kind to young children, elders, and animals.', 5),
(6, 'manners', 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'Actions are judged strictly by intentions.', 'اعمال کا دارومدار نیتوں پر ہے۔', 'Umar ibn al-Khattab (RA)', 'Sahih al-Bukhari 1', 'Always do good deeds purely to please Allah and help others.', 6),
(7, 'manners', 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', 'A Muslim is one from whose tongue and hands other Muslims are safe.', 'سچا مسلمان وہ ہے جس کی زبان اور ہاتھ سے دوسرے مسلمان محفوظ رہیں۔', 'Abdullah ibn Amr (RA)', 'Sahih al-Bukhari 10', 'Use your words to comfort and encourage, and never hurt anyone.', 7),
(8, 'truthfulness', 'قُلْ خَيْرًا أَوْ لِيَصْمُتْ', 'Speak what is good or remain silent.', 'اچھی بات کہو یا خاموش رہو۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 6018', 'Think before you speak: say kind, helpful words or stay peacefully quiet.', 8),
(9, 'prayer', 'الصَّلَاةُ عِمَادُ الدِّينِ', 'Prayer (Salah) is the pillar of religion.', 'نماز دین کا ستون ہے۔', 'Ali ibn Abi Talib (RA)', 'Al-Bayhaqi in Shu`ab al-Iman', 'Pray your 5 daily prayers on time with love and focus.', 9),
(10, 'manners', 'الدِّينُ النَّصِيحَةُ', 'The religion is sincere goodwill and advice.', 'دین خیرخواہی اور اخلاص کا نام ہے۔', 'Tamim ad-Dari (RA)', 'Sahih Muslim 55', 'Always wish the best for others and give gentle, caring advice.', 10),
(11, 'family', 'الْجَنَّةُ تَحْتَ أَقْدَامِ الأُمَّهَاتِ', 'Paradise lies beneath the feet of mothers.', 'جنت ماؤں کے قدموں تلے ہے۔', 'Mu`awiyah ibn Jahima (RA)', 'Sunan an-Nasa''i 3104', 'Love, respect, and obey your mother with gratitude and care.', 11),
(12, 'kindness', 'تَهَادَوْا تَحَابُّوا', 'Give gifts to one another and you will love one another.', 'ایک دوسرے کو تحائف دیا کرو، آپس میں محبت بڑھے گی۔', 'Abu Hurairah (RA)', 'Al-Adab Al-Mufrad 594', 'Share a small gift, a treat, or a drawing to spread joy and love.', 12),
(13, 'manners', 'لَا تَغْضَبْ', 'Do not become angry.', 'غصہ مت کرو۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 6116', 'When you feel upset, say A’udhu Billah, take deep breaths, or make Wudu.', 13),
(14, 'truthfulness', 'عَلَيْكُمْ بِالصِّدْقِ', 'You must adhere to truthfulness and honesty.', 'ہمیشہ سچائی کو لازم پکڑو۔', 'Abdullah ibn Mas`ud (RA)', 'Sahih Muslim 2607', 'Always speak the truth, even when it feels difficult.', 14),
(15, 'purity', 'السِّوَاكُ مَطْهَرَةٌ لِلْفَمِ مَرْضَاةٌ لِلرَّبِّ', 'The Siwak cleanses the mouth and pleases the Lord.', 'مسواک منہ کی صفائی اور رب کی رضا کا ذریعہ ہے۔', 'Aishah (RA)', 'Sunan an-Nasa''i 5', 'Brush your teeth and keep your breath clean, especially before prayer.', 15),
(16, 'kindness', 'الْيَدُ الْعُلْيَا خَيْرٌ مِنَ الْيَدِ السُّفْلَى', 'The upper giving hand is better than the lower taking hand.', 'اوپر والا (دینے والا) ہاتھ نیچے والے (لینے والے) ہاتھ سے بہتر ہے۔', 'Hakim ibn Hizam (RA)', 'Sahih al-Bukhari 1427', 'Be generous and eager to share what you have with those in need.', 16),
(17, 'manners', 'سَمِّ اللَّهَ وَكُلْ بِيَمِينِكَ', 'Mention the name of Allah (say Bismillah) and eat with your right hand.', 'اللہ کا نام لو اور اپنے دائیں ہاتھ سے کھاؤ۔', 'Umar ibn Abi Salamah (RA)', 'Sahih al-Bukhari 5376', 'Always say Bismillah and use your right hand when eating or drinking.', 17),
(18, 'kindness', 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', 'None of you truly believes until he loves for his brother what he loves for himself.', 'تم میں سے کوئی مومن نہیں ہو سکتا جب تک وہ اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے کرتا ہے۔', 'Anas ibn Malik (RA)', 'Sahih al-Bukhari 13', 'Treat others the way you want to be treated with love and fairness.', 18),
(19, 'family', 'رِضَا الرَّبِّ فِي رِضَا الْوَالِدِ', 'The pleasure of the Lord is in the pleasure of the parents.', 'رب کی رضا والدین کی خوشی میں ہے۔', 'Abdullah ibn Amr (RA)', 'Jami` at-Tirmidhi 1899', 'Make your parents smile and never speak harshly to them.', 19),
(20, 'manners', 'الْحَيَاءُ شُعْبَةٌ مِنَ الإِيمَانِ', 'Modesty (Haya) is a branch of faith.', 'حیا ایمان کا ایک اہم حصہ ہے۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 9', 'Carry yourself with dignity, good manners, and pure speech.', 20),
(21, 'knowledge', 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', 'Whoever travels a path seeking knowledge, Allah makes the path to Paradise easy for him.', 'جو شخص علم کی تلاش میں کسی راستے پر چلتا ہے، اللہ اس کے لیے جنت کا راستہ آسان فرما دیتا ہے۔', 'Abu Hurairah (RA)', 'Sahih Muslim 2699', 'Going to school, reading books, and attending Quran class are paths to Jannah!', 21),
(22, 'manners', 'أَفْشُوا السَّلَامَ بَيْنَكُمْ', 'Spread peace and greetings of Salam among yourselves.', 'آپس میں سلام کو عام کرو۔', 'Abu Hurairah (RA)', 'Sahih Muslim 54', 'Be the first to say "As-salamu alaykum" whenever you enter home or see a friend.', 22),
(23, 'kindness', 'أَحَبُّ النَّاسِ إِلَى اللَّهِ أَنْفَعُهُمْ لِلنَّاسِ', 'The most beloved people to Allah are those who are most beneficial to others.', 'لوگوں میں اللہ کو سب سے زیادہ محبوب وہ ہے جو لوگوں کو سب سے زیادہ نفع پہنچائے۔', 'Ibn Umar (RA)', 'Al-Mu’jam Al-Awsat 6026', 'Help someone clean up, carry bags, or solve a problem today.', 23),
(24, 'truthfulness', 'دَعْ مَا يَرِيبُكَ إِلَى مَا لَا يَرِيبُكَ', 'Leave that which makes you doubt for that which does not make you doubt.', 'اس چیز کو چھوڑ دو جو تمہیں شک میں ڈالے اور اسے اپناؤ جس میں کوئی شک نہ ہو۔', 'Al-Hasan ibn Ali (RA)', 'Jami` at-Tirmidhi 2518', 'Always choose honesty and clarity over questionable actions.', 24),
(25, 'manners', 'كُلُّ مَعْرُوفٍ صَدَقَةٌ', 'Every good deed is an act of charity.', 'ہر نیکی صدقہ ہے۔', 'Jabir ibn Abdullah (RA)', 'Sahih al-Bukhari 6021', 'Picking up litter, saying a kind word, or holding a door is rewarded as charity!', 25),
(26, 'prayer', 'مِفْتَاحُ الْجَنَّةِ الصَّلَاةُ', 'The key to Paradise is Salah (Prayer).', 'جنت کی چابی نماز ہے۔', 'Jabir ibn Abdullah (RA)', 'Jami` at-Tirmidhi 4', 'Guard your prayer faithfully as your personal key to Jannah.', 26),
(27, 'family', 'أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ بِرُّ الْوَالِدَيْنِ', 'Among the most beloved deeds to Allah is dutifulness to parents.', 'اللہ کو سب سے محبوب اعمال میں سے والدین کے ساتھ حسن سلوک ہے۔', 'Ibn Mas`ud (RA)', 'Sahih al-Bukhari 527', 'Listen to your mom and dad respectfully and help them before they ask.', 27),
(28, 'manners', 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ', 'A good, pleasant word is an act of charity.', 'اچھی اور میٹھی بات کہنا صدقہ ہے۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 2989', 'Speak softly, use polite words (please, thank you, JazakAllah Khair).', 28),
(29, 'kindness', 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ', 'Protect yourselves from the Fire, even with half a date given in charity.', 'جہنم کی آگ سے بچو خواہ کھجور کے ایک ٹکڑے کے ذریعے ہی ہو۔', 'Adi ibn Hatim (RA)', 'Sahih al-Bukhari 1417', 'No good deed is too small in the sight of Allah.', 29),
(30, 'manners', 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ', 'Indeed, Allah is Gentle and loves gentleness in all matters.', 'بے شک اللہ نرمی فرمانے والا ہے اور ہر معاملے میں نرمی کو پسند کرتا ہے۔', 'Aishah (RA)', 'Sahih al-Bukhari 6927', 'Be gentle with your voice, actions, and handling of things.', 30),
(31, 'purity', 'حُرِّمَتْ عَلَيْكُمُ النَّجَاسَةُ', 'Purity of body and surroundings is mandated for believers.', 'پاکیزگی اور طہارت ایمان والوں کی پہچان ہے۔', 'Abu Hurairah (RA)', 'Sunan Abu Dawud 381', 'Always perform Wudu properly and maintain cleanliness in the restroom.', 31),
(32, 'knowledge', 'اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ', 'Recite the Quran, for it will come on the Day of Resurrection as an intercessor for its companions.', 'قرآن پڑھا کرو کیونکہ یہ قیامت کے دن اپنے پڑھنے والوں کے لیے سفارشی بن کر آئے گا۔', 'Abu Umamah (RA)', 'Sahih Muslim 804', 'Read a few verses of the Holy Quran every morning or evening.', 32),
(33, 'kindness', 'أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا', 'The most complete believers in faith are those with the best character.', 'ایمان والوں میں سب سے مکمل ایمان اس کا ہے جس کے اخلاق سب سے اچھے ہوں۔', 'Abu Hurairah (RA)', 'Jami` at-Tirmidhi 1162', 'Good character means honesty, patience, humility, and kindness.', 33),
(34, 'truthfulness', 'الصِّدْقُ يَهْدِي إِلَى الْبِرِّ', 'Truthfulness leads to righteousness, and righteousness leads to Paradise.', 'سچائی نیکی کی طرف لے جاتی ہے اور نیکی جنت کی طرف۔', 'Abdullah ibn Mas`ud (RA)', 'Sahih al-Bukhari 6094', 'Build a reputation as a truthful child who can always be trusted.', 34),
(35, 'family', 'خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ', 'The best of you are those who are best to their families.', 'تم میں سے بہترین وہ ہے جو اپنے اہل و عیال کے لیے بہترین ہو۔', 'Aishah (RA)', 'Jami` at-Tirmidhi 3895', 'Help out at home with chores and bring happiness to your family.', 35),
(36, 'manners', 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ', 'The strong person is not the good wrestler, but the one who controls himself when angry.', 'طاقتور وہ نہیں جو کشتی میں پچھاڑ دے، بلکہ طاقتور وہ ہے جو غصے کے وقت اپنے نفس پر قابو رکھے۔', 'Abu Hurairah (RA)', 'Sahih al-Bukhari 6114', 'Real superhero strength is staying calm and patient when provoked.', 36),
(37, 'kindness', 'أَطْعِمُوا الطَّعَامَ وَأَفْشُوا السَّلَامَ', 'Feed people food and spread peace and greetings of Salam.', 'لوگوں کو کھانا کھلایا کرو اور سلام کو عام کرو۔', 'Abdullah ibn Amr (RA)', 'Sahih al-Bukhari 12', 'Share your snacks and lunch with friends and welcome guests joyfully.', 37),
(38, 'knowledge', 'مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ', 'Whoever Allah wants good for, He grants him deep understanding of the religion.', 'اللہ جس کے ساتھ بھلائی کا ارادہ فرماتا ہے، اسے دین کی سمجھ عطا فرماتا ہے۔', 'Mu`awiyah (RA)', 'Sahih al-Bukhari 71', 'Ask questions and love learning about Allah and our Prophet (PBUH).', 38),
(39, 'manners', 'لَا يَحِلُّ لِمُسْلِمٍ أَنْ يَهْجُرَ أَخَاهُ فَوْقَ ثَلَاثِ لَيَالٍ', 'It is not permissible for a Muslim to abandon his brother for more than three days.', 'کسی مسلمان کے لیے جائز نہیں کہ وہ اپنے بھائی سے تین دن سے زیادہ بول چال بند رکھے۔', 'Abu Ayyub al-Ansari (RA)', 'Sahih al-Bukhari 6077', 'If you have a disagreement with a friend or sibling, forgive quickly and make peace.', 39),
(40, 'knowledge', 'نَضَّرَ اللَّهُ امْرَأً سَمِعَ مِنَّا حَدِيثًا فَحَفِظَهُ', 'May Allah brighten the face of a person who hears a Hadith from us and memorizes it.', 'اللہ اس شخص کے چہرے کو تروتازہ رکھے جس نے ہماری حدیث سنی اور اسے یاد رکھا۔', 'Zayd ibn Thabit (RA)', 'Sunan Abi Dawud 3660', 'MashaAllah! You have reached 40 Hadiths! May Allah bless and illuminate your path in life.', 40)
ON CONFLICT (hadith_number) DO UPDATE SET
  arabic_text = EXCLUDED.arabic_text,
  english_text = EXCLUDED.english_text,
  urdu_text = EXCLUDED.urdu_text,
  topic = EXCLUDED.topic,
  narrator = EXCLUDED.narrator,
  reference = EXCLUDED.reference,
  kids_lesson = EXCLUDED.kids_lesson,
  order_index = EXCLUDED.order_index;
