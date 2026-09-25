---
type: runbook
title: "Object Storage, Caching and Egress"
description: "What lives in Supabase Storage, the immutable-object caching rule that governs egress, and the decision to stay on Supabase rather than migrate."
status: stable
verified: true
sources:
  - "src/lib/storage.ts"
  - "src/app/media/page.tsx"
  - "src/app/memorization/page.tsx"
  - "src/app/namaz/page.tsx"
  - "src/app/history/page.tsx"
  - "scripts/storage-report.mjs"
  - "scripts/storage-recache.mjs"
  - "scripts/storage-verify-cache.mjs"
tags:
  - operations
  - storage
  - caching
  - egress
  - cost
---

# Object Storage, Caching and Egress

All binary assets live in **Supabase Storage**, in two public buckets. The database stores the resulting public URL as a plain string (`media_library.file_url`, `memorization_catalog.image_url`), so the storage backend is swappable without a schema change.

## 📦 What is actually stored

Measured 2026-09-25 with `node scripts/storage-report.mjs`:

| Bucket | Files | Size | Contents |
|---|---|---|---|
| `media` | 31 | 250.2 MB | 30 Quran para PDFs (7.9–9.2 MB each) + 1 Qaida PDF |
| `memorization-images` | 124 | 11.2 MB | memorization chunks, namaz step photos, history covers |
| **Total** | **155** | **261.4 MB** | of the 1 GB free-tier allowance |

The para PDFs are 96% of all stored bytes. Images average ~90 KB and are not worth compressing.

---

## ⏳ The caching rule (this governs egress, not storage)

**Every upload path names its object with a random suffix**, so a given URL's bytes never change:

```ts
`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
```

Because the content is immutable, it must be cached for as long as the browser will hold it. All six upload sites pass `CACHE_FOREVER` from `src/lib/storage.ts` (`"31536000"`, one year).

This matters more than storage does. Both the teacher and the student load the same para during a live class, so at the previous `max-age=3600` each ~8 MB PDF was re-downloaded at *every* class:

| | Egress/month | Of the 5 GB allowance |
|---|---|---|
| 7 students, `max-age=3600` | ~2.3 GB | 46% |
| 15 students, `max-age=3600` | ~5.0 GB | **over** |
| 15 students, `max-age=31536000` | ~125 MB | 2.5% |

> **Invariant: never overwrite an existing path.** A one-year cache means a replaced object keeps serving the old bytes from browser caches for up to a year. Always upload under a new random name and update the URL column. Every current upload site already does this.

---

## 🧰 Storage scripts

All three read credentials from `.env` and never print them.

| Script | Purpose |
|---|---|
| `storage-report.mjs` | Per-bucket file count, total size, largest files, breakdown by type |
| `storage-recache.mjs` | Re-stamps existing objects with the one-year cache. `--dry-run` reports only; `--backup <dir>` writes every file to disk in the same pass |
| `storage-verify-cache.mjs` | Samples objects and prints the `Cache-Control` actually served |

### Gotchas these scripts encode

1. **Supabase has no metadata-only update.** `cacheControl` is fixed at upload time, so changing it on existing objects means downloading and re-uploading each one to the same path with `x-upsert: true`. Same path, same public URL, no database change.
2. **`HEAD` always reports `no-cache`.** Supabase answers HEAD from a path that does not apply the object's cache policy, so HEAD cannot be used to check caching. Verify with a ranged `GET` (`Range: bytes=0-0`) against the *public* URL — one byte, and it is what a browser actually does.
3. **The public and authenticated endpoints differ.** Public objects are served from `/storage/v1/object/public/<bucket>/<path>`; the authenticated `/storage/v1/object/<bucket>/<path>` behaves differently. Student traffic hits the public one, so that is the one that decides egress.
4. **Storage has no versioning and an overwrite cannot be undone.** Always run `storage-recache.mjs` with `--backup`.

---

## 🧭 Decision: stay on Supabase (2026-09-25)

Cloudflare R2, Backblaze B2, Bunny.net, Vercel Blob and Google Drive were all considered.

**Google Drive was rejected outright** as a serving origin: no stable direct URL, no HTTP Range support (so no audio/video seeking and no partial PDF fetch), per-file download quotas that trip when one file gets popular, no CORS headers, and no way to hold files on a consumer account without an OAuth refresh token. It is fine as a cold archive for master renders; it is not a CDN.

**The others were unnecessary.** Storage sits at 26% of the free tier, and the caching fix drops egress to ~3% of the allowance at 15 students. **Video — the one asset class that would have broken the free tier — goes to YouTube** (`youtube-nocookie.com` embeds, Unlisted where students appear, mind the "Made for Kids" flag), so it costs no storage and no egress at all.

**Revisit if either trigger fires:** stored bytes pass ~800 MB, or video ever needs to be self-hosted. Cloudflare R2 is then the pick — 10 GB free and egress free at any scale — and the migration is small because the database stores plain URLs.
