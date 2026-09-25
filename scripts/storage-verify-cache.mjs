#!/usr/bin/env node
/**
 * Report the Cache-Control actually served for a sample of Storage objects.
 *
 * Uses a ranged GET (one byte), not HEAD: Supabase answers HEAD from a path
 * that does not apply the object's cache policy and always says `no-cache`,
 * which makes HEAD useless for checking this. A browser issues GET, so GET is
 * the honest test.
 *
 *   node scripts/storage-verify-cache.mjs
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

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` }

/** First `n` real files under a bucket, descending into folders as needed. */
async function sample(bucket, prefix = "", n = 2) {
  const page = await fetch(`${BASE}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 100, offset: 0 }),
  }).then((r) => r.json())

  const out = []
  for (const item of page) {
    if (out.length >= n) break
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id && item.metadata) out.push({ path, meta: item.metadata })
    else out.push(...(await sample(bucket, path, n - out.length)))
  }
  return out.slice(0, n)
}

const buckets = await fetch(`${BASE}/storage/v1/bucket`, { headers: auth }).then((r) => r.json())

let allGood = true

for (const b of buckets) {
  console.log(`\n${b.id}  (public: ${b.public})`)

  for (const f of await sample(b.id)) {
    console.log(`  ${f.path}`)
    console.log(`    stored metadata : ${f.meta.cacheControl ?? "(none)"}`)

    // One byte, so this costs nothing even on an 8 MB para.
    const res = await fetch(`${BASE}/storage/v1/object/public/${b.id}/${f.path}`, {
      headers: { Range: "bytes=0-0" },
    })
    const served = res.headers.get("cache-control") ?? "(none)"
    const ok = served.includes("31536000")
    if (!ok) allGood = false
    console.log(`    served (GET)    : ${served}   ${ok ? "OK" : "<-- not cached"}`)
  }
}

console.log(
  allGood
    ? "\nAll sampled objects serve a one-year cache. Students download each file once."
    : "\nSome objects are not serving the long cache — the fix has not taken effect.",
)
