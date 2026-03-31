-- Quran Academy Database Schema

-- Students table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  guardian_name text NOT NULL,
  started_at date NOT NULL,
  fee numeric NOT NULL,
  fee_currency text NOT NULL DEFAULT 'PKR' CHECK (fee_currency IN ('PKR', 'USD', 'GBP', 'SAR')),
  para_number integer CHECK (para_number IS NULL OR (para_number >= 1 AND para_number <= 30)),
  memorizing text,
  class_time text,
  is_active boolean DEFAULT true,
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

-- RLS policies (allow all access — private local tool, no auth)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fee_payments" ON fee_payments FOR ALL USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_month_year ON fee_payments(month, year);
CREATE INDEX idx_students_is_active ON students(is_active);
