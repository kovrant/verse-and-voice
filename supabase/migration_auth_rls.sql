-- Tighten RLS policies: require an authenticated session.
-- Run after enabling Supabase Auth (email/password) and creating user accounts.

DROP POLICY IF EXISTS "Allow all on students" ON students;
DROP POLICY IF EXISTS "Allow all on fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Allow all on memorization_catalog" ON memorization_catalog;
DROP POLICY IF EXISTS "Allow all on student_memorization" ON student_memorization;
DROP POLICY IF EXISTS "Allow all on quran_rounds" ON quran_rounds;
DROP POLICY IF EXISTS "Allow all on media_library" ON media_library;

CREATE POLICY "Authenticated full access on students"
  ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on fee_payments"
  ON fee_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on memorization_catalog"
  ON memorization_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on student_memorization"
  ON student_memorization FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on quran_rounds"
  ON quran_rounds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on media_library"
  ON media_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage: restrict the memorization-images bucket to authenticated users.
DROP POLICY IF EXISTS "Allow public read on memorization-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all upload on memorization-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on memorization-images" ON storage.objects;

CREATE POLICY "Auth read on memorization-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memorization-images');
CREATE POLICY "Auth upload on memorization-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memorization-images');
CREATE POLICY "Auth update on memorization-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memorization-images');
CREATE POLICY "Auth delete on memorization-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memorization-images');
