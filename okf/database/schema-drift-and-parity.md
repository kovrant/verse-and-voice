---
type: data-model
title: "Schema Drift and Production Database Parity"
description: "Documented divergence between repository SQL migration files and the live Supabase production database."
status: stable
verified: true
sources:
  - "BUGS.md"
  - "README.md"
  - "CLAUDE.md"
  - "src/lib/para-progress.ts"
  - "src/app/class/page.tsx"
tags:
  - database
  - schema-drift
  - bugs
  - parity
---

# Schema Drift and Production Database Parity

> [!CAUTION]
> **The source of truth is the live database, not the repository migration files alone.**  
> A fresh PostgreSQL instance provisioned strictly from `supabase/*.sql` will **not** run the application because several critical tables and columns were added directly to production.

---

## 🔍 Documented Discrepancies

### 1. Missing `student_para_progress` Table DDL
* **Symptom:** `src/lib/para-progress.ts` reads and writes to `student_para_progress`, and `migration_para_progress_rls.sql` applies RLS policies to it—but no migration file creates the table.
* **Production Schema Reality:**
  ```sql
  CREATE TABLE IF NOT EXISTS student_para_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    para_number integer NOT NULL CHECK (para_number BETWEEN 0 AND 30),
    last_page integer NOT NULL DEFAULT 1,
    last_line integer,
    last_pointer_x double precision,
    last_pointer_y double precision,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(student_id, para_number)
  );
  ```

### 2. Missing Columns in `class_sessions`
* **Symptom:** `src/app/class/page.tsx` inserts `ending_page` and `last_page` on every session completion, but `migration_class_sessions.sql` only declares `starting_para` and `ending_para`.
* **Production Schema Reality:**
  ```sql
  ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS ending_page integer,
    ADD COLUMN IF NOT EXISTS last_page integer;
  ```

---

## 🎯 Remediation Plan
To establish true parity:
1. Run `supabase db pull` or export a full PostgreSQL pg_dump of the live database.
2. Commit a consolidated baseline migration script (`baseline.sql`) into `supabase/`.
3. Whenever a schema change is required in the future, commit the migration `.sql` file **and** apply it to the live Supabase SQL editor.
