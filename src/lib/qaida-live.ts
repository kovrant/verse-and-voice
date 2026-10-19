// Live-class protocol for the Qaida course (pure, no Supabase import).
//
// The `nav` broadcast carries `cardId` for Qaida (paraNumber = 0, page = course
// index + 1 so older clients and the monthly report stay harmless). Everything
// else that only the card deck needs rides one `qaida` broadcast event with a
// `kind`. Phase 3 adds exercise / answer / celebrate kinds.
import { type Card, cardById, firstCard, locateCard } from "@/content/qaida"

export type QaidaMessage =
  /** Show or hide the English hint under the Arabic. */
  | { kind: "reveal"; hint: boolean }
  /** Play this audio key on the child's device. */
  | { kind: "play"; key: string }
  /** Highlight one tile of the current card (null clears). */
  | { kind: "highlight"; tile: number | null }

/** Validate an incoming broadcast payload; returns null for anything malformed. */
export function parseQaidaMessage(payload: unknown): QaidaMessage | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  switch (p.kind) {
    case "reveal":
      return typeof p.hint === "boolean" ? { kind: "reveal", hint: p.hint } : null
    case "play":
      return typeof p.key === "string" && p.key ? { kind: "play", key: p.key } : null
    case "highlight":
      return p.tile === null
        ? { kind: "highlight", tile: null }
        : typeof p.tile === "number" && Number.isInteger(p.tile) && p.tile >= 0
          ? { kind: "highlight", tile: p.tile }
          : null
    default:
      return null
  }
}

/** The card a class starts on: the student's saved card if it still exists, else the first card. */
export function startingCard(savedCardId: string | null | undefined): Card {
  return (savedCardId && cardById(savedCardId)) || firstCard()
}

/** `page` value for the nav broadcast and class_sessions: 1-based course position. */
export function cardPage(cardId: string): number {
  return (locateCard(cardId)?.courseIndex ?? 0) + 1
}

/**
 * The tappable pieces of a card, in display order. The teacher highlights one by
 * index and the child sees the same piece lit. Text cards split on spaces (never
 * inside a word: Arabic letters must stay joined).
 */
export function cardTiles(card: Card): string[] {
  const words = (s: string | undefined) => (s ? s.split(/\s+/).filter(Boolean) : [])
  switch (card.type) {
    case "family":
      return card.members
    case "drill":
      return card.items.map((i) => i.arabic)
    case "shapes":
      return [card.forms.isolated, card.forms.initial, card.forms.medial, card.forms.final]
    case "exercise":
      return card.items.map((i) => i.arabic ?? i.shown?.join(" ") ?? i.ask ?? "")
    case "rule":
      return words(card.example)
    case "letter":
    case "syllable":
      return [card.arabic]
    case "word":
    case "ayah":
      return words(card.arabic)
    default:
      return []
  }
}

/** Every audio key a card can play (first one is what the Play button sends). */
export function cardAudioKeys(card: Card): string[] {
  switch (card.type) {
    case "letter":
    case "syllable":
    case "word":
    case "ayah":
      return [card.audio]
    case "drill":
      return card.items.map((i) => i.audio)
    case "exercise":
      return card.items.flatMap((i) =>
        Array.isArray(i.audio) ? i.audio : i.audio ? [i.audio] : [],
      )
    default:
      return []
  }
}

/** The audio key behind one tile, when tiles map one-to-one onto clips. */
export function tileAudioKey(card: Card, tile: number): string | null {
  if (card.type === "drill") return card.items[tile]?.audio ?? null
  if (card.type === "exercise") {
    const a = card.items[tile]?.audio
    return Array.isArray(a) ? (a[0] ?? null) : (a ?? null)
  }
  if (card.type === "letter" || card.type === "syllable") return tile === 0 ? card.audio : null
  return null
}

export type QaidaProgressStatus = "seen" | "practising" | "mastered" | "needs_work"
