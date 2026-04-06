-- Setup: Create storage bucket for memorization images
-- Run this in Supabase SQL Editor ONCE

-- Create the bucket (public so images can be viewed without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorization-images', 'memorization-images', true)
ON CONFLICT DO NOTHING;

-- Allow anyone to read images
CREATE POLICY "Public read memorization images"
ON storage.objects FOR SELECT
USING (bucket_id = 'memorization-images');

-- Allow anyone to upload images
CREATE POLICY "Allow upload memorization images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'memorization-images');

-- Allow anyone to update images
CREATE POLICY "Allow update memorization images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'memorization-images');

-- Allow anyone to delete images
CREATE POLICY "Allow delete memorization images"
ON storage.objects FOR DELETE
USING (bucket_id = 'memorization-images');
