-- Setup: Create storage buckets
-- Run this in Supabase SQL Editor ONCE

-- Single unified media bucket (public for viewing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public read media" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload media" ON storage.objects;
DROP POLICY IF EXISTS "Allow update media" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete media" ON storage.objects;

CREATE POLICY "Public read media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Allow upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow update media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media');

CREATE POLICY "Allow delete media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');

-- Keep old bucket for backward compatibility
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorization-images', 'memorization-images', true)
ON CONFLICT DO NOTHING;
