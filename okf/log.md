---
type: log
title: "OKF Change and Curation Log"
description: "Chronological history of updates, additions, and modifications to the Quran Academy OKF catalog."
status: stable
verified: true
sources:
  - "okf/index.md"
tags:
  - log
  - provenance
---

# Knowledge Catalog Curation Log

### [2026-09-24] - Initial Catalog Genesis (v0.2 Standard)
* **Author:** OKF Specialist (Agentic System)
* **Scope:** Full repository review and catalog creation.
* **Entries Created:**
  * Master index (`okf/index.md`) and curation log (`okf/log.md`).
  * Architecture specifications: `dual-portal-routing.md`, `auth-and-roles.md`, `rls-security-model.md`, `realtime-protocol.md`, `timezone-and-dates.md`.
  * Domain logic specifications: `quran-progress-tracking.md`, `qaida-curriculum.md`, `memorization-and-hifz.md`, `live-class-session.md`, `namaz-and-learning.md`, `student-management.md`.
  * Database specifications: `schema-overview.md`, `migration-pipeline.md`, `schema-drift-and-parity.md`.
  * Operations specifications: `development-standards.md`, `known-issues.md` (fully absorbing `BUGS.md`).
* **Motivation:** Establish a single Git-native source of truth for architectural invariants, eliminating silent runtime failures and providing context-efficient guidance for human developers and AI coding agents.

### [2026-09-24] - Student Portal Design System Captured
* **Author:** Claude (pairing session)
* **Scope:** Student portal (`/student/**`) visual language.
* **Entries Created:** `architecture/student-design-system.md`.
* **Entries Updated:** `index.md` (new Architecture entry); `architecture/dual-portal-routing.md` (student portal no longer has a sidebar; cross-link to the design system).
* **Code Change Documented:** The raised "chunky bottom edge" (`box-shadow: 0 Npx 0 <tint>` plus an `active:translate-y` press) was removed from every student surface in favour of the `shadow-soft*` scale and `active:scale-[0.99]`. Students and other reviewers disliked the 3D lip. Commits `cd6ce77`, `d930aa8`, `6dd126f`.
* **Defects Fixed Alongside:** `shadow-soft-md` was referenced by five components but never defined in `tailwind.config.js`, so it rendered nothing; the unused `.btn-chunky` / `.btn-chunky-accent` utilities were deleted from `globals.css`.
* **Drift Recorded:** `globals.css` line 1 imports Arabic faces from the Google Fonts CDN, contradicting the self-hosted-fonts rule asserted in `dual-portal-routing.md`.
* **Motivation:** The design system was the largest undocumented area of the codebase and the one most exposed to accidental teacher-side regressions; the `kid` prop contract needed to be written down before the next restyle.

### [2026-09-24] - Arabic Fonts Self-Hosted
* **Author:** Claude (pairing session)
* **Scope:** Font loading across both portals.
* **Entries Updated:** `operations/known-issues.md` (issue 6 removed — resolved); `architecture/student-design-system.md` (invariants 6 and 7 now state the real font rule and the Arabic stack); `architecture/dual-portal-routing.md`.
* **Code Change Documented:** Dropped the `@import url('https://fonts.googleapis.com/...')` from `globals.css:1`. Scheherazade New and Noto Naskh Arabic (Arabic subsets, 400/600/700) were copied from `@fontsource` into `src/app/fonts/` and registered with `next/font/local` as `--font-scheherazade` and `--font-naskh`. The three Arabic stacks in `tailwind.config.js` and the `font-arabic` utility in `globals.css` now reference those variables instead of bare family names, which `next/font` hashes and would no longer have matched.
* **Motivation:** Removes a render-blocking third-party request and a per-page-load privacy leak to Google on behalf of every student, and makes Quranic text render correctly with the CDN blocked or offline. Amiri had been downloaded twice (self-hosted *and* from the CDN).

### [2026-09-25] - Storage Caching and the Decision Not to Migrate
* **Author:** Claude (pairing session)
* **Scope:** Supabase Storage, egress cost, hosting choice.
* **Entries Created:** `operations/storage-and-caching.md`.
* **Entries Updated:** `index.md`.
* **Code Change Documented:** All six upload sites now pass `CACHE_FOREVER` (`"31536000"`) from the new `src/lib/storage.ts` instead of the literal `"3600"`. At one hour, both teacher and student re-downloaded the same ~8 MB para PDF at every class, which was the bulk of project egress and would have breached the 5 GB free allowance at 15 students.
* **Operational Work:** `scripts/storage-recache.mjs` re-stamped all 155 existing objects (261.4 MB, 0 failures) with the one-year cache, since Supabase fixes `cacheControl` at upload time and offers no metadata-only update. A full local backup was taken in the same pass. Stored metadata confirmed as `max-age=31536000`; **serve-side verification via ranged GET was still outstanding when this was written** — run `scripts/storage-verify-cache.mjs`.
* **Decision Recorded:** Stay on Supabase. Google Drive rejected as a serving origin (no Range support, per-file download quotas, no CORS, no stable direct URL). Video goes to YouTube rather than object storage. Revisit at ~800 MB stored or if video must be self-hosted, in which case Cloudflare R2.
* **Measurement:** 155 objects, 261.4 MB, 26% of the 1 GB free tier. The 30 para PDFs are 96% of stored bytes.

