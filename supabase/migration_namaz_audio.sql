-- ─────────────────────────────────────────────────────────────────────────────
-- Namaz audio: `namaz-audio` storage bucket for teacher recordings
--
-- Public read (students play the clip by its public URL), teacher-only write.
-- Audio types only, 10 MB cap. The URL is stored on namaz_step_parts.audio_url
-- (column from migration_namaz_guidance.sql), which teachers already write
-- through "Teacher full access on namaz_step_parts".
-- Run AFTER migration_namaz_guidance.sql. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'namaz-audio',
  'namaz-audio',
  true,
  10485760, -- 10 MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read namaz-audio" ON storage.objects;
CREATE POLICY "Public read namaz-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'namaz-audio');

DROP POLICY IF EXISTS "Teacher upload on namaz-audio" ON storage.objects;
CREATE POLICY "Teacher upload on namaz-audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'namaz-audio' AND public.is_teacher());

DROP POLICY IF EXISTS "Teacher update on namaz-audio" ON storage.objects;
CREATE POLICY "Teacher update on namaz-audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'namaz-audio' AND public.is_teacher())
  WITH CHECK (bucket_id = 'namaz-audio' AND public.is_teacher());

DROP POLICY IF EXISTS "Teacher delete on namaz-audio" ON storage.objects;
CREATE POLICY "Teacher delete on namaz-audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'namaz-audio' AND public.is_teacher());
