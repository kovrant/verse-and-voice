"use client"

import { useEffect, useState } from "react"

export type MascotMood = "awake" | "sleepy" | "excited"

/** Face ink stays dark forest in both themes — `--primary` turns cream in dark mode. */
const INK = "hsl(125 12% 20%)"

/**
 * Time-of-day mood on the child's own clock: awake 6am–7pm, sleepy otherwise.
 * Starts "awake" and settles after mount, so server and client HTML match.
 */
export function useMascotMood(): MascotMood {
  const [mood, setMood] = useState<MascotMood>("awake")
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours()
      setMood(h >= 6 && h < 19 ? "awake" : "sleepy")
    }
    update()
    const id = setInterval(update, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])
  return mood
}

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "awake":
      return (
        <>
          {/* Open eyes with a sparkle */}
          <circle cx="40" cy="50" r="4" fill={INK} />
          <circle cx="56" cy="56" r="4" fill={INK} />
          <circle cx="41.4" cy="48.6" r="1.3" fill="#fff" />
          <circle cx="57.4" cy="54.6" r="1.3" fill="#fff" />
          <path
            d="M39 64q8 8 16 0"
            stroke={INK}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )
    case "excited":
      return (
        <>
          {/* ^ ^ eyes and an open, happy mouth */}
          <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M36 52q4-6 8 0" />
            <path d="M50 58q4-6 8 0" />
          </g>
          <path d="M39 64q8 11 16 0z" fill={INK} />
          <path
            d="M43 67.5q4 3 8 0"
            stroke="hsl(var(--accent))"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )
    case "sleepy":
    default:
      return (
        <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M36 50q4 4 8 0" />
          <path d="M52 56q4 4 8 0" />
          <path d="M40 64q7 6 14 0" />
        </g>
      )
  }
}

/**
 * "Hilal" — the student portal's mascot: a smiling crescent moon. Deliberately
 * an object, not a person or animal, so it suits every family. Its face follows
 * `mood`: awake by day, sleepy at night (with a little star), excited for news.
 */
export function MoonMascot({
  className,
  mood = "awake",
}: {
  className?: string
  mood?: MascotMood
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="46" fill="hsl(var(--gold) / 0.18)" />
      <path
        d="M62 14a38 38 0 1 0 22 58A32 32 0 0 1 62 14z"
        fill="hsl(var(--c-y-300))"
        stroke="hsl(var(--gold))"
        strokeWidth="2"
      />
      {/* Nudged left so the right eye clears the crescent's inner edge. */}
      <g transform="translate(-5 0)">
        <Face mood={mood} />
        <circle cx="35" cy="60" r="3.5" fill="hsl(var(--accent))" opacity="0.45" />
      </g>
      {mood === "sleepy" && (
        <path
          d="M78 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
          fill="hsl(var(--kid-saffron))"
          className="animate-pulse"
        />
      )}
      {mood === "excited" && (
        <g fill="hsl(var(--kid-saffron))">
          <path d="M80 18l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" />
          <path d="M86 44l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" />
        </g>
      )}
    </svg>
  )
}
