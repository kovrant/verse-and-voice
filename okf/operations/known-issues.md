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

---

## 🟡 Low Priority / Latent Issues

### 3. Round Dates Parsed as UTC in Class Journey Timeline
* **Location:** `src/app/class/page.tsx:422-423,434`
* **Defect:** `new Date(r.started_at)` is called on date-only `YYYY-MM-DD` strings.
* **Consequence:** For viewers situated west of UTC (negative UTC offsets), this parses as UTC midnight and renders as the previous calendar day.
* **Remediation:** Replace `new Date(...)` with `parseLocalDate(...)` from `src/lib/utils.ts` (matching `src/components/quran-journey.tsx:213-214`).

### 4. Re-opening Older Quran Rounds via Edit Round
* **Location:** `saveEditRound` in `src/app/students/[id]/page.tsx`
* **Defect:** Clearing `completed_at` on an older round can leave two incomplete rounds open simultaneously.
* **Mitigation Currently Active:** `getActiveRound` selects the *latest* incomplete round by `started_at`, preventing the app from updating the wrong round, but leaving an unnatural data state.
* **Remediation:** Add validation preventing un-completing an older round if a subsequent round has already started.

### 5. Unpaginated Student List Query
* **Location:** `src/app/students/page.tsx:113`
* **Defect:** Uses unpaginated `.select("*")` on `students`.
* **Consequence:** Silently truncates at PostgREST's 1,000-row limit once total academy enrollment exceeds 1,000.
* **Remediation:** Convert to `fetchAllRows("students", ...)` from `src/lib/supabase.ts`.

### 6. Arabic Fonts Loaded from the Google Fonts CDN
* **Location:** `src/app/globals.css:1`
* **Defect:** An `@import url('https://fonts.googleapis.com/css2?family=Amiri…&family=Noto+Naskh+Arabic…&family=Scheherazade+New…')` sits at the top of the stylesheet, contradicting the self-hosted-fonts rule stated in [Dual-Portal Routing](../architecture/dual-portal-routing.md) and [Student Portal Design System](../architecture/student-design-system.md).
* **Consequence:** A render-blocking third-party request on every page load, a privacy leak to Google on behalf of every student, and unstyled Arabic if the CDN is blocked or offline. The UI faces (Baloo 2, Nunito Sans, Amiri) are already self-hosted under `src/app/fonts/`, so the two mechanisms are inconsistent.
* **Remediation:** Self-host the three Arabic faces alongside the existing `.woff2` files and delete the `@import`.
