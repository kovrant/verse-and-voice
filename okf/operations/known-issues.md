---
type: runbook
title: "Known Issues and Technical Debt"
description: "Active defect log, historical bug resolutions, and technical debt tracking (supersedes BUGS.md)."
status: stable
verified: true
sources:
  - "BUGS.md"
  - "src/app/class/page.tsx"
  - "src/app/students/[id]/page.tsx"
  - "src/app/students/page.tsx"
tags:
  - operations
  - bugs
  - tech-debt
---

# Known Issues and Technical Debt

This catalog serves as the canonical record of active defects and architectural debt, superseding `BUGS.md`.

---

## 🔴 High Priority: Database Drift

### 1. ~~Missing `student_para_progress` Table DDL~~ (Resolved)
* **Resolved:** `schema.sql` and `migration_student_para_progress.sql` now create it. The live `UNIQUE(student_id, para_number)` is now declared there too (and in `migration_para_progress_fixes.sql`).
* **Impact:** A database provisioned strictly from `supabase/*.sql` lacks this table, causing bookmarking and live class resumption to fail.
* **Details:** See full DDL in [Schema Drift & Production Parity](../database/schema-drift-and-parity.md).

### 2. ~~Missing `class_sessions` Columns (`ending_page`, `last_page`)~~ (Resolved)
* **Resolved:** `schema.sql`, `migration_class_sessions.sql` and `migration_student_para_progress.sql` now declare both.
* **Impact:** Saving a completed live class session fails on a clean migration database.
* **Details:** See full DDL in [Schema Drift & Production Parity](../database/schema-drift-and-parity.md).


---

## 🟡 Styling

### 3. Tailwind `font-heading` / `font-display` / `font-brand` / `font-serif` never apply Baloo 2
* **Cause:** `tailwind.config` lists the family as `"Baloo 2"` without inner quotes, so the generated CSS is `font-family: var(--font-heading), Baloo 2, …`. An unquoted name containing a number is invalid, so the whole declaration is dropped at computed-value time and the element inherits the body font (Nunito Sans).
* **Impact:** Any element using these utilities renders in the body font. Plain `h1`–`h6` are unaffected (the base rule in `globals.css` quotes the name). Fixing it (`"'Baloo 2'"` in the config) will visibly change headings across both portals, so do it as its own reviewed change.
* **Workaround:** `[font-family:var(--font-heading)]`, as the public text pages do.
