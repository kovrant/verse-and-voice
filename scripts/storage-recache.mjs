#!/usr/bin/env node
/**
 * Re-stamp every existing Storage object with a one-year Cache-Control.
 *
 * Supabase bakes cacheControl into an object's metadata at upload time and has
 * no metadata-only update, so each file has to be downloaded and re-uploaded to
 * the SAME path with `x-upsert`. Same path means the same public URL, so no
 * database rows change and nothing in the app breaks.
 *
 * Objects already at max-age=31536000 are skipped, so this is safe to re-run.
 *
 * Storage has no versioning and an overwrite cannot be undone, so pass
 * --backup: every file is written to disk on the way past, in the same pass
 * that re-uploads it. No extra downloads, and a bad write can be restored by
 * re-uploading from that folder.
 *
 *   node scripts/storage-recache.mjs --dry-run               # report only
 *   node scripts/storage-recache.mjs --backup ~/qa-backup    # back up, then do it
 *   node scripts/storage-recache.mjs                         # do it, no backup
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"

const DRY = process.argv.includes("--dry-run")
const TARGET = "max-age=31536000"

const backupFlag = process.argv.indexOf("--backup")
const BACKUP =
  backupFlag === -1
    ? null
    : resolve((process.argv[backupFlag + 1] || "").replace(/^~(?=$|\/)/, homedir()))
if (backupFlag !== -1 && (!BACKUP || process.argv[backupFlag + 1]?.startsWith("--"))) {
  console.error("--backup needs a directory, e.g. --backup ~/qa-backup")
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ]
    }),
)

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const mb = (b) => (b / 1024 / 1024).toFixed(1) + " MB"

async function walk(bucket, prefix = "") {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${BASE}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    })
    if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    if (!page.length) break
    for (const item of page) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null || !item.metadata) out.push(...(await walk(bucket, path)))
      else out.push({ path, size: item.metadata.size ?? 0, type: item.metadata.mimetype })
    }
    if (page.length < 100) break
  }
  return out
}

const buckets = await fetch(`${BASE}/storage/v1/bucket`, { headers: auth }).then((r) => r.json())
if (!Array.isArray(buckets)) {
  console.error("Could not list buckets:", buckets)
  process.exit(1)
}

let done = 0
let skipped = 0
let moved = 0
let failed = 0

for (const b of buckets) {
  const files = await walk(b.id)
  console.log(`\n${b.id}: ${files.length} objects`)

  for (const f of files) {
    const url = `${BASE}/storage/v1/object/${b.id}/${f.path}`

    // Skip anything already stamped — makes the script re-runnable.
    const head = await fetch(url, { method: "HEAD", headers: auth })
    if (head.headers.get("cache-control")?.includes("31536000")) {
      skipped++
      continue
    }

    if (DRY) {
      console.log(`  would re-stamp ${mb(f.size).padStart(9)}  ${f.path}`)
      done++
      moved += f.size
      continue
    }

    try {
      const get = await fetch(url, { headers: auth })
      if (!get.ok) throw new Error(`download ${get.status}`)
      const body = Buffer.from(await get.arrayBuffer())

      // Guard against a truncated download being written back over the original.
      if (f.size && body.length !== f.size) {
        throw new Error(`size mismatch: got ${body.length} bytes, expected ${f.size}`)
      }

      // Save before overwriting, so a bad write is always recoverable.
      if (BACKUP) {
        const dest = join(BACKUP, b.id, f.path)
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, body)
      }

      const put = await fetch(url, {
        method: "PUT",
        headers: {
          ...auth,
          "Content-Type": f.type || "application/octet-stream",
          "Cache-Control": TARGET,
          "x-upsert": "true",
        },
        body,
      })
      if (!put.ok) throw new Error(`upload ${put.status} ${await put.text()}`)

      done++
      moved += f.size
      console.log(`  ok ${mb(f.size).padStart(9)}  ${f.path}`)
    } catch (err) {
      failed++
      console.error(`  FAILED  ${f.path}: ${err.message}`)
    }
  }
}

console.log(
  `\n${DRY ? "[dry run] " : ""}re-stamped ${done}, already current ${skipped}, failed ${failed}` +
    `  (${mb(moved)} transferred)`,
)
if (BACKUP && !DRY) console.log(`backup written to ${BACKUP}`)
else if (!BACKUP && !DRY) console.log(`no backup taken (pass --backup <dir> next time)`)
if (failed) process.exitCode = 1
