"use client"

import type { ReactNode } from "react"

import { BODY, f, HEAD, mix } from "@/components/welcome/welcome-styles"

const ROSE = "#C98A8A"
const INK = "#2E3A2F"

/** The open book from the logo. */
const BookIcon = (
  <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">
    <path
      d="M9 15 Q16.5 12 24 15 L24 36 Q16.5 33 9 36 Z M24 15 Q31.5 12 39 15 L39 36 Q31.5 33 24 36 Z"
      fill="#FFFFFF"
      stroke={INK}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 20 L20.5 19.5 M12.5 24 L20.5 23.5 M12.5 28 L20.5 27.5 M27.5 19.5 L35.5 20 M27.5 23.5 L35.5 24 M27.5 27.5 L35.5 28"
      stroke="#6B7F5B"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

/** The voice: five bars, like the logo's waveform. */
const VoiceIcon = (
  <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">
    {[
      [11, 10],
      [17, 18],
      [23, 26],
      [29, 18],
      [35, 10],
    ].map(([x, h]) => (
      <rect key={x} x={x - 2} y={24 - h / 2} width="4" height={h} rx="2" fill={INK} />
    ))}
  </svg>
)

/** The eight-pointed ayah star. */
const StarIcon = (
  <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true">
    <rect x="-8" y="-8" width="16" height="16" fill="#E3B04B" />
    <rect x="-8" y="-8" width="16" height="16" fill="#E3B04B" transform="rotate(45)" />
    <circle r="4" fill="#FFFFFF" />
  </svg>
)

const MOVES: { title: string; text: string; icon: ReactNode; tint: string }[] = [
  {
    title: "Learn",
    text: "A picture of every step and the words your teacher checked, from Takbir to Salam.",
    icon: BookIcon,
    tint: "#7FA3B8",
  },
  {
    title: "Repeat",
    text: "Your teacher says it in her own voice, your child says it back, until it sits right.",
    icon: VoiceIcon,
    tint: ROSE,
  },
  {
    title: "Pray",
    text: "Then the first full salah on their own, every step in order, start to finish.",
    icon: StarIcon,
    tint: "#E3B04B",
  },
]

/**
 * Chapter 6 in three moves: learn, repeat, pray. Three cards and two arrows,
 * revealed one after another as the section scrolls in. Nothing else moves.
 */
export function PrayMoves() {
  return (
    <ol
      aria-label="How a child learns salah: learn, repeat, pray"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))",
        gap: 14,
        alignItems: "stretch",
      }}
    >
      {MOVES.map((m, i) => (
        <li
          key={m.title}
          data-from="translateY(16px) scale(.96)"
          data-fade=""
          data-delay={i * 140}
          data-dur="600"
          style={{
            position: "relative",
            borderRadius: 24,
            background: "#FFFFFF",
            border: `1.5px solid ${mix(ROSE, 45)}`,
            boxShadow: "0 8px 24px rgba(46,58,47,0.10)",
            padding: "22px 22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: mix(m.tint, 32),
                flexShrink: 0,
              }}
            >
              {m.icon}
            </span>
            <span style={{ ...f(700, "13px", "1", HEAD), color: "#864848" }}>{i + 1}</span>
            <h3 style={{ margin: 0, ...f(700, "24px", "1.1", HEAD), color: INK }}>{m.title}</h3>
          </div>
          <p style={{ margin: 0, ...f(400, "16px", "1.55", BODY), color: "#4F3F3F" }}>{m.text}</p>
          {i < MOVES.length - 1 && (
            <span
              aria-hidden="true"
              className="pray-arrow"
              style={{
                position: "absolute",
                right: -22,
                top: "50%",
                width: 30,
                height: 30,
                marginTop: -15,
                borderRadius: "50%",
                background: "#FFFFFF",
                border: `1.5px solid ${mix(ROSE, 60)}`,
                display: "grid",
                placeItems: "center",
                zIndex: 1,
                ...f(700, "15px", "1", HEAD),
                color: "#864848",
              }}
            >
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
