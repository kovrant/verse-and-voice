-- Migration: Add bookmark support (line number and pointer coordinates)
-- Run this in Supabase SQL Editor

-- Add bookmark columns to student_para_progress
ALTER TABLE student_para_progress
  ADD COLUMN IF NOT EXISTS last_line integer CHECK (last_line >= 1 AND last_line <= 15),
  ADD COLUMN IF NOT EXISTS last_pointer_x numeric,
  ADD COLUMN IF NOT EXISTS last_pointer_y numeric;

-- Add bookmark columns to class_sessions
ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS ending_line integer CHECK (ending_line >= 1 AND ending_line <= 15),
  ADD COLUMN IF NOT EXISTS ending_pointer_x numeric,
  ADD COLUMN IF NOT EXISTS ending_pointer_y numeric;
