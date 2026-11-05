/**
 * Memorization cards painted from text: a light pastel template with the Arabic
 * centred on it. The result is a PNG uploaded as the item's / part's image_url,
 * so every screen that shows those pictures keeps working unchanged.
 *
 * ponytail: one template, colour picked from the item id. When the look changes,
 * edit PALETTES / paintMemCard and re-save an item's text to repaint its cards.
 */

export interface CardPalette {
  name: string
  bg: string
  ink: string
  accent: string
}

export const PALETTES: CardPalette[] = [
  { name: "peach", bg: "#FDEBDD", ink: "#6E3517", accent: "#F7CBAA" },
  { name: "sky", bg: "#E4F0FB", ink: "#1B4570", accent: "#BCD8F3" },
  { name: "mint", bg: "#E3F5EC", ink: "#1C5541", accent: "#B7E4CF" },
  { name: "lilac", bg: "#EFEBFB", ink: "#3F3179", accent: "#D2C9F4" },
  { name: "rose", bg: "#FCE7EF", ink: "#752544", accent: "#F4C3D5" },
  { name: "lemon", bg: "#FBF4D8", ink: "#634C0C", accent: "#F1DD96" },
]

/** A stable palette per item, so an item's cover and all its parts match. */
export function paletteFor(id: string): CardPalette {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}

/** The teacher's text as parts: one non-empty line each, trimmed. */
export function splitParts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Greedy word wrap. Explicit newlines always break; long lines wrap at spaces.
 * `measure` is injected so this stays testable without a canvas.
 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number) {
  const out: string[] = []
  for (const para of splitParts(text)) {
    let line = ""
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (line && measure(next) > maxWidth) {
        out.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) out.push(line)
  }
  return out
}

export const CARD_W = 1200
export const CARD_H = 800

/** The app's Quranic face (next/font hashes the family name into a CSS var). */
function arabicFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue("--font-scheherazade").trim()
  return v || "serif"
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Eight-point star (two overlapping squares), the small mark above the text. */
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (const turn of [0, Math.PI / 4]) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(turn)
    ctx.fillRect(-r, -r, r * 2, r * 2)
    ctx.restore()
  }
}

/** Paint one card and return it as a PNG blob. */
export async function paintMemCard(text: string, palette: CardPalette): Promise<Blob> {
  const family = arabicFamily()
  await document.fonts.load(`700 80px ${family}`, text).catch(() => {})

  const canvas = document.createElement("canvas")
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  // Background and soft corner bubbles
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.fillStyle = palette.accent
  dot(ctx, 40, 40, 140)
  dot(ctx, CARD_W - 30, CARD_H - 20, 170)
  ctx.globalAlpha = 0.7
  dot(ctx, CARD_W - 120, 90, 26)
  dot(ctx, 150, CARD_H - 90, 18)
  ctx.globalAlpha = 1

  // Small star above the text
  ctx.fillStyle = palette.ink
  ctx.globalAlpha = 0.18
  star(ctx, CARD_W / 2, 92, 18)
  ctx.globalAlpha = 1

  // Fit the text: shrink until the wrapped block fits the box.
  const boxW = CARD_W - 180
  const boxH = CARD_H - 220
  let size = 150
  let lines: string[] = []
  ctx.direction = "rtl"
  for (; size >= 34; size -= 4) {
    ctx.font = `700 ${size}px ${family}`
    lines = wrapLines(text, boxW, (s) => ctx.measureText(s).width)
    if (lines.length * size * 1.45 <= boxH) break
  }

  ctx.fillStyle = palette.ink
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const lineH = size * 1.45
  const top = CARD_H / 2 + 10 - ((lines.length - 1) * lineH) / 2
  lines.forEach((l, i) => ctx.fillText(l, CARD_W / 2, top + i * lineH))

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't draw the card"))),
      "image/png",
    ),
  )
}
