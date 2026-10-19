// Regenerates qaida-draft/qaida-cards.json (the data behind the review page) from the
// TypeScript content module in src/content/qaida. Loads the module through vite's dev
// server so no extra tooling is needed:
//   node scripts/qaida-deck-json.mjs
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createServer } from "vite"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const mod = await server.ssrLoadModule("/src/content/qaida/index.ts")
  const deck = mod.QAIDA_DECK
  const out = join(root, "qaida-draft", "qaida-cards.json")
  writeFileSync(out, JSON.stringify(deck, null, 1))
  const cards = mod.allCards()
  const count = (t) => cards.filter((c) => c.type === t).length
  console.log(
    `wrote ${out}: ${deck.units.length} units, ${cards.length} cards, ${count("exercise")} exercises, ${count("word") + count("ayah")} words`,
  )
} finally {
  await server.close()
}
