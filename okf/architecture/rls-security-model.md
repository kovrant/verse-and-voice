---
type: architecture
title: "Row Level Security (RLS) Model"
description: "Client-side direct data querying patterns and RLS policy rules as the sole security perimeter."
status: stable
verified: true
sources:
  - "supabase/schema.sql"
  - "supabase/migration_auth_rls.sql"
  - "supabase/migration_student_portal.sql"
  - "src/lib/supabase.ts"
tags:
  - security
  - rls
  - supabase
  - postgresql
---

# Row Level Security (RLS) Model

In Quran Academy, almost every page is a Next.js **Client Component querying Supabase directly using the public anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). There is no intermediate server-side API or data-access layer for normal page rendering.

> [!CAUTION]
> **RLS is the ONLY security boundary in this application.** If a developer or migration script creates a table without enabling and defining RLS policies, that table is readable and writable by any authenticated student.

---

## 📐 Canonical Policy Pattern

All application tables must strictly adhere to the security pattern established in `supabase/migration_student_portal.sql`:

1. **Teacher Access:** Full access (SELECT, INSERT, UPDATE, DELETE) via the `is_teacher()` SQL helper function.
2. **Student Access:** Strictly scoped to rows matching the student's own ID via the `my_student_id()` SQL helper function.

### SQL Helper Functions
```sql
-- Checks if current user is an authenticated teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS boolean AS $$
BEGIN
  RETURN (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolves the student ID linked to current auth user
CREATE OR REPLACE FUNCTION my_student_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM students WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 Standard Table Policy Blueprint

When provisioning any new table:

```sql
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- 1. Full teacher access
CREATE POLICY "Teacher full access on new_feature"
  ON new_feature
  FOR ALL
  TO authenticated
  USING (is_teacher())
  WITH CHECK (is_teacher());

-- 2. Scoped student access
CREATE POLICY "Student read own new_feature"
  ON new_feature
  FOR SELECT
  TO authenticated
  USING (student_id = my_student_id());
```

---

## ⚠️ Historical Gotchas & Traps

1. **The Silent 403 Lockout:**  
   If RLS is enabled on a table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) but no policies are declared, PostgreSQL defaults to rejecting all queries. This happened with `student_para_progress`, causing client reads and writes to silently 403 without informative errors.
2. **Service-Role Boundary:**  
   The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS checks. It must **only** be imported in server-side API routes via `src/lib/supabase-admin.ts` and must never be exposed or passed to the browser bundle.
