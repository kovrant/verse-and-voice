-- Quran Academy Database Schema
-- Run this in Supabase SQL Editor

-- Students table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  guardian_name text NOT NULL,
  country text,
  started_at date NOT NULL,
  ended_at date,
  status text NOT NULL DEFAULT 'Reading' CHECK (status IN ('Reading', 'Completed', 'Left Uncompleted')),
  fee numeric NOT NULL,
  fee_currency text NOT NULL DEFAULT 'GBP' CHECK (fee_currency IN ('PKR', 'USD', 'GBP', 'SAR', 'BHD')),

  -- Quran progress
  is_qaida boolean NOT NULL DEFAULT true,
  desc_completed integer NOT NULL DEFAULT 0 CHECK (desc_completed >= 0 AND desc_completed <= 30),
  asc_completed integer NOT NULL DEFAULT 0 CHECK (asc_completed >= 0 AND asc_completed <= 30),
  memorizing text,

  class_time text,
  created_at timestamptz DEFAULT now()
);

-- Fee payments table
CREATE TABLE fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, month, year)
);

-- RLS policies (allow all — private local tool, no auth)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fee_payments" ON fee_payments FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_month_year ON fee_payments(month, year);
CREATE INDEX idx_students_status ON students(status);

-- Seed data
-- desc_completed = paras done from 30 going down
-- asc_completed = the para number they are currently ON (0 = not started ascending)
INSERT INTO students (name, guardian_name, country, started_at, status, ended_at, fee, fee_currency, is_qaida, desc_completed, asc_completed) VALUES
  ('Mahad',        'Waqar',   'Saudi Arabia',    '2017-01-23', 'Reading',            NULL,         35,  'GBP', false, 5,  20),
  ('Ahmed',        'Ayesha',  'United Kingdom',  '2021-01-14', 'Reading',            NULL,         35,  'GBP', false, 0,  0),
  ('Shaaf',        'Adeel',   'United Kingdom',  '2019-06-10', 'Reading',            NULL,         35,  'GBP', false, 5,  12),
  ('Areen',        'Adeel',   'United Kingdom',  '2019-06-10', 'Reading',            NULL,         35,  'GBP', false, 5,  10),
  ('Rida',         'Mohsin',  'Bahrain',         '2019-09-30', 'Completed',          '2023-10-31',  0,  'BHD', false, 1,  30),
  ('Dania',        'Mohsin',  'Bahrain',         '2020-09-30', 'Completed',          '2025-12-28', 40,  'BHD', false, 5,  26),
  ('Amal',         'Jawad',   'United States',   '2021-06-05', 'Left Uncompleted',   '2025-09-30', 80,  'USD', false, 0,  0),
  ('Aarin',        'Madiha',  'United Kingdom',  '2022-06-06', 'Reading',            NULL,         50,  'GBP', false, 0,  0),
  ('Huzzair',      'Jawad',   'United States',   '2023-10-09', 'Left Uncompleted',   '2025-09-30', 20,  'USD', true,  0,  0),
  ('Zoyal Jahan',  'Maliha',  'United States',   '2024-01-24', 'Reading',            NULL,         80,  'USD', false, 0,  0),
  ('Rayan',        'Raheel',  'United Kingdom',  '2024-02-01', 'Reading',            NULL,         40,  'GBP', false, 5,  20),
  ('Zoe',          'Maliha',  'United States',   '2025-09-03', 'Reading',            NULL,          0,  'USD', true,  0,  0);
