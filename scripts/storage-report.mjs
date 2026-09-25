#!/usr/bin/env node
/**
 * Read-only Supabase Storage report: per-bucket file count, total bytes and the
 * biggest offenders. Reads credentials from .env; never prints them.
 *
 * Run:  node scripts/storage-report.mjs
 *
 * Egress is a billing metric and is not exposed by the data API — read it from
 * the dashboard (Reports -> Egress).
 */
import { readFileSync } from "node:fs"

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

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

const mb = (b) => (b / 1024 / 1024).toFixed(1) + " MB"

/** The list endpoint returns one folder level at a time, so walk it. */
async function walk(bucket, prefix = "") {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prefix,
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    })
    if (!res.ok) throw new Error(`${bucket}/${prefix}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    if (!page.length) break
    for (const item of page) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      // A folder comes back with no id/metadata.
      if (item.id === null || !item.metadata) out.push(...(await walk(bucket, path)))
      else out.push({ path, size: item.metadata.size ?? 0, type: item.metadata.mimetype })
    }
    if (page.length < 100) break
  }
  return out
}

const buckets = await fetch(`${URL_BASE}/storage/v1/bucket`, { headers }).then((r) => r.json())
if (!Array.isArray(buckets)) {
  console.error("Could not list buckets:", buckets)
  process.exit(1)
}

let grand = 0
const byType = new Map()

for (const b of buckets) {
  const files = await walk(b.id)
  const total = files.reduce((a, f) => a + f.size, 0)
  grand += total
  for (const f of files) {
    const k = (f.type || "unknown").split("/")[0]
    const cur = byType.get(k) || { n: 0, bytes: 0 }
    byType.set(k, { n: cur.n + 1, bytes: cur.bytes + f.size })
  }

  console.log(`\n${b.id}  (${b.public ? "public" : "private"})`)
  console.log(`  files: ${files.length}   total: ${mb(total)}`)
  if (files.length) {
    console.log(`  largest:`)
    for (const f of files.sort((a, z) => z.size - a.size).slice(0, 8)) {
      console.log(`    ${mb(f.size).padStart(10)}  ${f.path}`)
    }
  }
}

console.log("\nBy type:")
for (const [k, v] of [...byType].sort((a, z) => z[1].bytes - a[1].bytes)) {
  console.log(`  ${k.padEnd(12)} ${String(v.n).padStart(4)} files  ${mb(v.bytes).padStart(10)}`)
}
console.log(`\nTOTAL STORED: ${mb(grand)}  of 1024.0 MB free-tier allowance`)
console.log(`Egress is not in the data API — read it from Reports -> Egress in the dashboard.`)
