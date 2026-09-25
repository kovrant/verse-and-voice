---
type: index
title: "Quran Academy Knowledge Catalog"
description: "Master index and entry point for the Quran Academy Open Knowledge Format (OKF) catalog."
status: stable
verified: true
sources:
  - "README.md"
  - "CLAUDE.md"
  - "BUGS.md"
  - "package.json"
tags:
  - index
  - architecture
  - domain
  - database
  - operations
---

# Quran Academy Knowledge Catalog (OKF)

Welcome to the **Quran Academy** Open Knowledge Format (OKF) catalog. This catalog acts as the canonical, Git-native single source of truth for all domain logic, architectural invariants, security rules, and operational procedures across the codebase.

## 🧭 System Overview

* **Application:** Quran Academy management and learning platform.
* **Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL, Auth, Realtime, Storage) + Tailwind CSS + Vitest.
* **Core Philosophy:** "Ponytail" lazy senior developer mode — shortest working diff, reuse existing helpers, zero unrequested abstractions, edge-case-correct standard library implementations.

---

## 📚 Knowledge Modules

### 1. Architecture & Security
* [Dual-Portal Routing & Confinement](architecture/dual-portal-routing.md): Strict separation between Teacher (`/admin`) and Student (`/student/**`) environments, layout styling, and middleware boundaries.
* [Authentication & Role Hierarchy](architecture/auth-and-roles.md): JWT `app_metadata.role` precedence, `profiles.role` fallback, and deterministic student username-to-email mapping.
* [Row Level Security (RLS) Model](architecture/rls-security-model.md): The sole security boundary for client-side direct queries; policy patterns (`is_teacher()`, `my_student_id()`) and service-role bypass.
* [Realtime Channel Protocol](architecture/realtime-protocol.md): Supabase Realtime broadcast and presence on `class:<studentId>` and `students:online`; normalized scroll ratios (0..1).
* [Student Portal Design System](architecture/student-design-system.md): The kid-facing visual language of `/student/**` — crayon palette tokens, the `kid-ui` kit, the opt-in `kid` prop that keeps the teacher UI unchanged, and the flat-surface rule.
* [Timezone & Date Invariants](architecture/timezone-and-dates.md): Strict Pakistan Standard Time (PKT / UTC+5), string time sorting via `classTimeToMinutes`, and `YYYY-MM-DD` vs `timestamptz` rules.

### 2. Domain Logic & Curriculum
* [Quran Progress Tracking](domain/quran-progress-tracking.md): Dual-direction round progress math (`desc_completed + max(asc_completed - 1, 0)`), khatm transitions, and active round detection.
* [Qaida Curriculum & Sentinel](domain/qaida-curriculum.md): Sentinel value `para_number = 0`, media library mapping, and curriculum progression.
* [Memorization (Hifz) & Revision](domain/memorization-and-hifz.md): Sabaq, Sabqi, Manzil lifecycle, chunk allocation, and revision scheduling triggers.
* [Live Interactive Class](domain/live-class-session.md): Realtime whiteboard/mushaf pointer sync, debounced progress writes, and class session lifecycles.
* [Namaz & Islamic Studies](domain/namaz-and-learning.md): Namaz step verification, Arabic normalization, streak calculation, and Hadith/history modules.
* [Student Lifecycle & Accounts](domain/student-management.md): Student provisioning, fee ledger, activity beacon tracking, and notification deduplication.

### 3. Database & Infrastructure
* [Database Schema & PostgREST Limits](database/schema-overview.md): Core tables, relationships, and the PostgREST 1000-row unfiltered query limit (`fetchAllRows`).
* [Migration Pipeline & Order](database/migration-pipeline.md): Hand-applied SQL execution order and manual schema change workflows.
* [Schema Drift & Production Parity](database/schema-drift-and-parity.md): Uncommitted production tables (`student_para_progress`), missing columns in `class_sessions`, and live DB baseline.

### 4. Operations & Maintenance
* [Development Standards & Testing](operations/development-standards.md): Ponytail principles, testing pure helpers with Vitest, formatting, and linting.
* [Object Storage, Caching & Egress](operations/storage-and-caching.md): What lives in Supabase Storage, the immutable-object caching rule that governs egress, the storage scripts, and the decision to stay on Supabase rather than migrate.
* [Known Issues & Tech Debt](operations/known-issues.md): Active defect catalog (absorbed from `BUGS.md`) and planned remediation paths.

---

## 📜 Catalog Maintenance
See [log.md](log.md) for the complete audit trail of catalog initialization, updates, and schema migrations.
