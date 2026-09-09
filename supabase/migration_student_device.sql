-- Add device tracking columns to students table
-- Stores the student's detected device (e.g. "iPad (10.9\")", "MacBook", "Windows PC") and last active timestamp.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS last_device text,
  ADD COLUMN IF NOT EXISTS last_device_at timestamptz;
