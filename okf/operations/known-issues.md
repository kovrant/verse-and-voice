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

### 1. Missing `student_para_progress` Table DDL
* **Impact:** A database provisioned strictly from `supabase/*.sql` lacks this table, causing bookmarking and live class resumption to fail.
* **Details:** See full DDL in [Schema Drift & Production Parity](../database/schema-drift-and-parity.md).

### 2. Missing `class_sessions` Columns (`ending_page`, `last_page`)
* **Impact:** Saving a completed live class session fails on a clean migration database.
* **Details:** See full DDL in [Schema Drift & Production Parity](../database/schema-drift-and-parity.md).

