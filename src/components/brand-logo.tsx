import { cn } from "@/lib/utils"

/** Voice waveform above the book: x, half-height, colour. Symmetric around y=35. */
const BARS = [
  { x: 29, h: 5, color: "#6FA3A0" },
  { x: 39.5, h: 12, color: "#9D8BB5" },
  { x: 50, h: 18, color: "#C96F4F" },
  { x: 60.5, h: 12, color: "#E3B04B" },
  { x: 71, h: 5, color: "#8FA97A" },
]

/**
 * The Verse & Voice mark: an open Quran (verse) with a voice waveform rising
 * from it (our voice-based classes), and an eight-pointed ayah star. Brand
 * colours are fixed hex on purpose so the mark looks the same in every theme.
 * `animated`: the waveform "talks" and the star twinkles (CSS in globals.css,
 * off under prefers-reduced-motion).
 */
export function BrandLogo({
  className,
  animated = false,
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Verse & Voice"
      className={cn(animated && "vv-logo--animated", className)}
    >
      <defs>
        <linearGradient id="vv-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7EFE0" />
          <stop offset="1" stopColor="#F3E7D2" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="28" fill="url(#vv-logo-bg)" />

      <g strokeWidth="6" strokeLinecap="round">
        {BARS.map((b, i) => (
          <line
            key={b.x}
            className="vv-logo-bar"
            style={{ animationDelay: `${[-0.1, -0.45, -0.2, -0.6, -0.3][i]}s` }}
            x1={b.x}
            x2={b.x}
            y1={35 - b.h}
            y2={35 + b.h}
            stroke={b.color}
          />
        ))}
      </g>

      {/* Open book */}
      <g stroke="#2E3A2F" strokeWidth="3.4" strokeLinejoin="round" fill="#FBF8F0">
        <path d="M50 60 C41 54 29 53 16 56 L16 80 C29 77 41 78 50 85 Z" />
        <path d="M50 60 C59 54 71 53 84 56 L84 80 C71 77 59 78 50 85 Z" />
      </g>
      <g stroke="#6B7F5B" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M23 64 Q33 62 43 65" />
        <path d="M23 71 Q33 69 43 72" />
        <path d="M57 65 Q67 62 77 64" />
        <path d="M57 72 Q67 69 77 71" />
      </g>
      <path d="M50 60 V85" stroke="#2E3A2F" strokeWidth="3.4" strokeLinecap="round" />

      {/* Ayah star */}
      <path
        className="vv-logo-star"
        d="M81 12 l2 4 4.3 -1.3 -1.3 4.3 4 2 -4 2 1.3 4.3 -4.3 -1.3 -2 4 -2 -4 -4.3 1.3 1.3 -4.3 -4 -2 4 -2 -1.3 -4.3 4.3 1.3z"
        fill="#E3B04B"
      />
    </svg>
  )
}
