"use client"

import { useEffect, useRef, useState } from "react"

import { ar, BODY, f, HEAD } from "@/components/welcome/welcome-styles"

/** The five daily prayers, placed along the day's arc (0 = dawn, 1 = night). */
const PRAYERS = [
  { name: "Fajr", arabic: "الفجر", when: "before sunrise", t: 0.06 },
  { name: "Dhuhr", arabic: "الظهر", when: "midday", t: 0.32 },
  { name: "Asr", arabic: "العصر", when: "afternoon", t: 0.56 },
  { name: "Maghrib", arabic: "المغرب", when: "sunset", t: 0.8 },
  { name: "Isha", arabic: "العشاء", when: "night", t: 0.96 },
]

const W = 800
const H = 262
/** A quadratic arc from the left horizon up over the card and down to the right. */
function arc(t: number) {
  const u = 1 - t
  return {
    x: u * u * 40 + 2 * u * t * 400 + t * t * 760,
    y: u * u * 240 + 2 * u * t * -60 + t * t * 240,
  }
}
const ARC_D = `M${arc(0).x} ${arc(0).y} Q400 -60 ${arc(1).x} ${arc(1).y}`
const DAY_MS = 4200

/**
 * Chapter 6: a Muslim's day, told by its five prayers. When the card scrolls
 * into view the sun rises at Fajr, crosses the arc, sets at Maghrib and the
 * crescent takes over at Isha. Each prayer lights as the sun passes it.
 */
export function PrayerDay() {
  const box = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / DAY_MS)
          setP(k)
          if (k < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const sunT = Math.min(p, 0.8)
  const sun = arc(sunT)
  const sunOpacity = p < 0.8 ? 1 : Math.max(0, 1 - (p - 0.8) / 0.08)
  const moonOpacity = Math.max(0, Math.min(1, (p - 0.86) / 0.1))
  const moon = arc(0.96)
  const nightOpacity = Math.max(0, Math.min(1, (p - 0.7) / 0.3))

  return (
    <div
      ref={box}
      role="img"
      aria-label="The five daily prayers from dawn to night: Fajr, Dhuhr, Asr, Maghrib and Isha, with the sun crossing the sky between them"
      style={{
        position: "relative",
        maxWidth: 880,
        margin: "0 auto",
        borderRadius: 28,
        overflow: "hidden",
        border: "1.5px solid rgba(46,58,47,0.12)",
        boxShadow: "0 8px 24px rgba(46,58,47,0.12)",
        // the day, left to right: dawn blue, warm noon, dusk, night
        background:
          "linear-gradient(90deg, #DCE7EC 0%, #F5EBD3 30%, #F3E3C6 55%, #E6C5AE 78%, #3A4451 100%)",
      }}
    >
      {/* night falls over the right side as the sun goes down */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(18,22,18,0) 55%, rgba(18,22,18,.55) 100%)",
          opacity: nightOpacity,
          transition: "opacity .3s linear",
          pointerEvents: "none",
        }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" style={{ display: "block" }}>
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#E3B04B" stopOpacity="0.55" />
            <stop offset="1" stopColor="#E3B04B" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* the ground line and the arc the sun travels */}
        <path d="M0 242 H800" stroke="rgba(46,58,47,.18)" strokeWidth="2" />
        <path
          d={ARC_D}
          fill="none"
          stroke="rgba(46,58,47,.28)"
          strokeWidth="2"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        {/* soft hills */}
        <ellipse cx="180" cy="300" rx="320" ry="70" fill="rgba(143,169,122,.35)" />
        <ellipse cx="620" cy="305" rx="300" ry="64" fill="rgba(143,169,122,.28)" />
        {/* prayer marks on the arc */}
        {PRAYERS.map((pr) => {
          const pt = arc(pr.t)
          const lit = p >= pr.t
          return (
            <g key={pr.name}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="13"
                fill={lit ? "rgba(227,176,75,.28)" : "transparent"}
                style={{ transition: "fill .4s" }}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill={lit ? "#E3B04B" : "#FFFFFF"}
                stroke="#2E3A2F"
                strokeWidth="2"
                style={{ transition: "fill .4s" }}
              />
            </g>
          )
        })}
        {/* the sun */}
        <g style={{ opacity: sunOpacity, transition: "opacity .2s" }}>
          <circle cx={sun.x} cy={sun.y} r="46" fill="url(#sunGlow)" />
          <circle cx={sun.x} cy={sun.y} r="18" fill="#E3B04B" stroke="#2E3A2F" strokeWidth="2" />
        </g>
        {/* the crescent at Isha */}
        <g
          style={{ opacity: moonOpacity, transition: "opacity .3s" }}
          transform={`translate(${moon.x} ${moon.y - 2})`}
        >
          <path
            d="M6 -16a16 16 0 1 0 10 26A13 13 0 0 1 6 -16z"
            fill="#F0ECDE"
            stroke="#2E3A2F"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M-14 -22l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"
            fill="#E3B04B"
          />
        </g>
      </svg>
      {/* labels under each prayer, aligned with its mark */}
      <div style={{ position: "relative", height: 80 }}>
        {PRAYERS.map((pr) => {
          const pt = arc(pr.t)
          const lit = p >= pr.t
          const night = pr.t >= 0.86 && p >= 0.86
          return (
            <div
              key={pr.name}
              style={{
                position: "absolute",
                left: `${(pt.x / W) * 100}%`,
                top: 8,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                textAlign: "center",
                color: night ? "#F0ECDE" : "#2E3A2F",
                opacity: lit ? 1 : 0.55,
                transition: "opacity .4s, color .4s",
                whiteSpace: "nowrap",
              }}
            >
              <span style={f(700, "clamp(13px,1.6vw,17px)", "1.1", HEAD)}>{pr.name}</span>
              <span
                lang="ar"
                dir="rtl"
                style={{
                  ...ar(700, "clamp(13px,1.5vw,16px)", "1.4"),
                  fontFamily: "var(--font-arabic), 'Amiri', 'Traditional Arabic', serif",
                }}
              >
                {pr.arabic}
              </span>
              <span style={{ ...f(600, "clamp(10px,1.1vw,12px)", "1.2", BODY), opacity: 0.75 }}>
                {pr.when}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
