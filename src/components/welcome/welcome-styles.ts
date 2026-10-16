import type { CSSProperties } from "react"

/* ── Fonts: the mock's Google families → the app's self-hosted faces ── */
export const HEAD = "var(--font-heading), 'Baloo 2', sans-serif"
export const BODY = "var(--font-body), 'Nunito Sans', sans-serif"
export const ARABIC =
  "var(--font-scheherazade), var(--font-arabic), var(--font-naskh), 'Traditional Arabic', serif"

/** `font: <weight> <size>/<line-height> <family>` as a style object. */
export function f(weight: number, size: string, lh: string, family: string): CSSProperties {
  return { fontWeight: weight, fontSize: size, lineHeight: lh, fontFamily: family }
}
/** Arabic text, with the Indo-Pak jazm the portal uses everywhere. */
export function ar(weight: number, size: string, lh: string): CSSProperties {
  return { ...f(weight, size, lh, ARABIC), fontFeatureSettings: '"cv78" 2, "calt" 1, "liga" 1' }
}
export const eyebrow = (color: string): CSSProperties => ({
  ...f(700, "13px", "1", BODY),
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color,
})
export const h2 = (): CSSProperties => ({
  margin: 0,
  ...f(700, "clamp(36px,4.6vw,56px)", "1.05", HEAD),
})
export const para = (): CSSProperties =>
  ({ margin: 0, ...f(400, "18px", "1.65", BODY), textWrap: "pretty" }) as CSSProperties
export const SHADOW = "0 8px 24px rgba(46,58,47,0.12)"
export const mix = (hex: string, pct: number) => `color-mix(in srgb,${hex} ${pct}%,#FFFFFF)`
