"use client"

/**
 * The /welcome landing page: a 1:1 port of the approved Claude Design mock
 * ("Verse and Voice.dc.html"). Layout, colours, copy and motion follow the mock;
 * the only substitutions are the self-hosted fonts (see FONT_* below) and
 * React state in place of the mock's runtime. Styles are inline on purpose so
 * the page reads like the source it was ported from.
 */

import Link from "next/link"
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  type AgeBand,
  AGES,
  BUBBLES,
  CAL,
  CONTACT,
  DOODLES,
  HADITH_AR,
  HEADLINES,
  IKHLAS,
  MUSHAF_PAGES,
  NAV,
  QUOTES,
  SCENES,
  SKY,
  STARS,
} from "@/components/welcome/welcome-data"
import { PraySteps } from "@/components/welcome/welcome-pray"
import {
  ar,
  BODY,
  eyebrow,
  f,
  h2,
  HEAD,
  mix,
  para,
  SHADOW,
} from "@/components/welcome/welcome-styles"
import type { NamazSlide } from "@/lib/welcome-namaz"

const clamp = (v: number) => Math.max(0, Math.min(1, v))

/* ── Chapter 4: the lantern road ──
 * A gentle S-curve from the bottom-left up to the mosque. Thirty lanterns stand
 * along it, one per para; Hilal walks beneath them as they light. */
const ROAD = { w: 640, h: 400 }
function roadPoint(s: number) {
  return { x: 34 + s * 520, y: 372 - s * 212 + Math.sin(s * Math.PI * 3) * 30 }
}
const ROAD_D =
  "M" +
  Array.from({ length: 121 }, (_, i) => {
    const p = roadPoint(i / 120)
    return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join(" L")
const LANTERNS = Array.from({ length: 30 }, (_, i) => ({
  ...roadPoint((i + 0.5) / 30),
  milestone: (i + 1) % 5 === 0,
}))
const MOSQUE = { x: 560, base: 162 }

const CSS = `
html{background:var(--sky,#F8F6EE);scroll-behavior:smooth}
body{background:transparent!important;color:#2E3A2F}
.vvw a{color:#C96F4F}.vvw a:hover{color:#2E3A2F}
.vvw :focus-visible{outline:3px solid #D98363;outline-offset:3px;border-radius:12px}
.vvw input,.vvw select,.vvw button{font:inherit}
.vvw h1,.vvw h2,.vvw h3{color:inherit;letter-spacing:0}
.vvw .lift{transition:transform .2s}.vvw .lift:hover{transform:translateY(-2px)}.vvw .lift:active{transform:scale(.99)}
.vvw .lift-dark:hover{color:#2E3A2F}
.vvw .press{transition:transform .2s,background .2s}.vvw .press:hover{transform:translateY(-2px)}.vvw .press:active{transform:scale(.96)}
.vvw .gold:hover{color:#E3B04B!important}
.vvw .film{scrollbar-width:thin}
@keyframes vvBar{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
@keyframes vvTwinkle{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes vvShine{0%{transform:translateX(-160%) skewX(-20deg)}55%,100%{transform:translateX(380%) skewX(-20deg)}}
@keyframes vvWrite{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.vvw .alif-write{animation:vvWrite 1.6s cubic-bezier(.6,.1,.3,1) .4s both}
@keyframes vvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes vvPop{0%{transform:scale(0) rotate(-30deg);opacity:0}70%{transform:scale(1.12) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes vvLineOut{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}
@keyframes vvLineIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes vvPageGlow{0%,100%{opacity:0}50%{opacity:1}}
@keyframes vvTap{0%,100%{transform:scale(1)}40%{transform:scale(.9)}}
.vvw .line-out{animation:vvLineOut .32s ease-in both}
.vvw .line-in{animation:vvLineIn .5s cubic-bezier(.34,1.3,.64,1) both}
.vvw .page-glow{animation:vvPageGlow 1.15s ease-in-out both}
.vvw .lantern .body{fill:#F3EBDA;transition:fill .45s}.vvw .lantern .glow{opacity:0;transition:opacity .5s}.vvw .lantern .flame{opacity:0;transition:opacity .3s}
.vvw .lantern.lit .body{fill:#E3B04B}.vvw .lantern.lit .glow{opacity:.55}.vvw .lantern.lit .flame{opacity:1}
.vvw .mosque .dome{fill:#FFFFFF;transition:fill .6s}.vvw .mosque .domeglow{opacity:0;transition:opacity .8s}.vvw .mosque .star{opacity:0;transform:translateY(0);transition:opacity .8s .3s,transform 1.2s cubic-bezier(.34,1.3,.64,1) .3s}
.vvw .mosque.lit .dome{fill:#E3B04B}.vvw .mosque.lit .domeglow{opacity:.6}.vvw .mosque.lit .star{opacity:1;transform:translateY(-34px)}
@keyframes vvFlame{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.12) rotate(3deg)}}
@keyframes vvBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@media (prefers-reduced-motion: reduce){.vvw *,.vvw *::before,.vvw *::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}
`

/* ── Small shared pieces ──────────────────────────────────────────── */

const bar = (x: number, color: string, anim: string): ReactNode => (
  <rect
    key={x}
    x={x}
    y="13"
    width="2.6"
    height="12"
    rx="1.3"
    fill={color}
    style={{ transformBox: "fill-box", transformOrigin: "50% 100%", animation: anim }}
  />
)

/** The talking logo from the mock (book, five voice bars, twinkling ayah star). */
function Logo({
  size,
  id,
  label,
  style,
}: {
  size: number
  id: string
  label: string
  style?: CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={label} style={style}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCE6D2" />
          <stop offset="1" stopColor="#EFE5D3" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      {bar(13.6, "#6FA3A0", "vvBar 1.1s ease-in-out infinite")}
      {bar(18.1, "#9D8BB5", "vvBar .9s ease-in-out .15s infinite")}
      {bar(22.7, "#C96F4F", "vvBar 1.2s ease-in-out .3s infinite")}
      {bar(27.3, "#E3B04B", "vvBar .95s ease-in-out .1s infinite")}
      {bar(31.8, "#8FA97A", "vvBar 1.05s ease-in-out .4s infinite")}
      <path
        d="M9 29 Q16.5 26 24 29 L24 39 Q16.5 36 9 39 Z M24 29 Q31.5 26 39 29 L39 39 Q31.5 36 24 39 Z"
        fill="#FFFFFF"
        stroke="#2E3A2F"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 31.6 L20.5 31.2 M12.5 34.4 L20.5 34 M27.5 31.2 L35.5 31.6 M27.5 34 L35.5 34.4"
        stroke="#6B7F5B"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <g transform="translate(40 8.5)">
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "vvTwinkle 2.4s ease-in-out infinite",
          }}
        >
          <rect x="-3" y="-3" width="6" height="6" fill="#E3B04B" />
          <rect x="-3" y="-3" width="6" height="6" fill="#E3B04B" transform="rotate(45)" />
        </g>
      </g>
    </svg>
  )
}

/** Eight-pointed ayah star. */
function Star({ size, style, inner }: { size: number; style?: CSSProperties; inner?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" style={style}>
      <rect x="-8" y="-8" width="16" height="16" fill="#E3B04B" />
      <rect x="-8" y="-8" width="16" height="16" fill="#E3B04B" transform="rotate(45)" />
      {inner && <circle r="5" fill="#FFFFFF" />}
    </svg>
  )
}

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 12h14M13 6l6 6-6 6"
      fill="none"
      stroke="#2E3A2F"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function Shine({ delay = "" }: { delay?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "35%",
        height: "100%",
        background: "linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent)",
        animation: `vvShine 4s ease-in-out ${delay} infinite`,
        pointerEvents: "none",
      }}
    />
  )
}

/** The sunrise pill (coral → saffron, shine sweep, white arrow pad). */
function SunrisePill({
  href,
  label,
  h = 58,
  pad = 46,
  size = "19px",
  delay,
  submit,
  shadow = SHADOW,
}: {
  href?: string
  label: string
  h?: number
  pad?: number
  size?: string
  delay?: string
  submit?: boolean
  shadow?: string
}) {
  const style: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    gap: 14,
    height: h,
    padding: h < 58 ? "0 5px 0 22px" : "0 6px 0 26px",
    border: 0,
    cursor: "pointer",
    borderRadius: 999,
    background: "linear-gradient(90deg,#D98363,#E3B04B)",
    color: "#2E3A2F",
    ...f(700, size, "1", HEAD),
    textDecoration: "none",
    boxShadow: shadow,
  }
  const inner = (
    <>
      <Shine delay={delay} />
      <span style={{ position: "relative", whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          position: "relative",
          width: pad,
          height: pad,
          borderRadius: "50%",
          background: "#FFFFFF",
          display: "grid",
          placeItems: "center",
        }}
      >
        <ArrowIcon />
      </span>
    </>
  )
  return submit ? (
    <button type="submit" className="lift" style={style}>
      {inner}
    </button>
  ) : (
    <a href={href} className="lift" style={style}>
      {inner}
    </a>
  )
}

const Bars = ({
  color,
  dur,
  delays,
  h = 16,
}: {
  color: string
  dur: string
  delays: string[]
  h?: number
}) => (
  <>
    {delays.map((d, i) => (
      <span
        key={i}
        style={{
          width: 3,
          height: h,
          borderRadius: 2,
          background: color,
          animation: `vvBar ${dur} ease-in-out ${d} infinite`,
        }}
      />
    ))}
  </>
)

/* ── Chapter 3: the teacher turns a page, the student's page turns too ── */

// Timeline of one cycle (ms). Slow on purpose: look at the teacher, see the
// page turn, then the focus hands over to the student and their page turns.
const T_FOCUS_TEACHER = 0
const T_TEACHER_TAP = 1000
const T_TEACHER_TURN = 1250
const OUT_MS = 480 // old lines drift out…
const CHANGE_MS = 1150 // …then the new lines have settled
const T_FOCUS_STUDENT = 3200
const T_STUDENT_TURN = 4200
const T_TOAST_OFF = 7400
const T_FOCUS_OFF = 7800
const CYCLE_MS = 9500

type Focus = "none" | "teacher" | "student"
type Phase = "idle" | "out" | "in"

function PageTurnDemo() {
  const box = useRef<HTMLDivElement>(null)
  const [teacherPage, setTeacherPage] = useState(0)
  const [studentPage, setStudentPage] = useState(0)
  const [teacherPhase, setTeacherPhase] = useState<Phase>("idle")
  const [studentPhase, setStudentPhase] = useState<Phase>("idle")
  const [focus, setFocus] = useState<Focus>("none")
  const [tapping, setTapping] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))
    const next = (p: number) => (p + 1) % MUSHAF_PAGES.length
    const cycle = () => {
      const r = box.current?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return
      later(() => setFocus("teacher"), T_FOCUS_TEACHER)
      later(() => setTapping(true), T_TEACHER_TAP)
      later(() => setTapping(false), T_TEACHER_TAP + 500)
      if (reduced) {
        later(() => setTeacherPage(next), T_TEACHER_TURN)
        later(() => setFocus("student"), T_FOCUS_STUDENT)
        later(() => {
          setStudentPage(next)
          setToast(true)
        }, T_STUDENT_TURN)
      } else {
        later(() => setTeacherPhase("out"), T_TEACHER_TURN)
        later(() => {
          setTeacherPage(next)
          setTeacherPhase("in")
        }, T_TEACHER_TURN + OUT_MS)
        later(() => setTeacherPhase("idle"), T_TEACHER_TURN + CHANGE_MS)
        later(() => setFocus("student"), T_FOCUS_STUDENT)
        later(() => {
          setStudentPhase("out")
          setToast(true)
        }, T_STUDENT_TURN)
        later(() => {
          setStudentPage(next)
          setStudentPhase("in")
        }, T_STUDENT_TURN + OUT_MS)
        later(() => setStudentPhase("idle"), T_STUDENT_TURN + CHANGE_MS)
      }
      later(() => setToast(false), T_TOAST_OFF)
      later(() => setFocus("none"), T_FOCUS_OFF)
    }
    const first = window.setTimeout(cycle, 900)
    const id = window.setInterval(cycle, CYCLE_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
      timers.forEach(clearTimeout)
    }
  }, [])

  const t = MUSHAF_PAGES[teacherPage]
  const st = MUSHAF_PAGES[studentPage]

  /** Spotlight: the phone being looked at grows a little, the other steps back. */
  const spot = (who: Exclude<Focus, "none">): CSSProperties => {
    const on = focus === who
    const off = focus !== "none" && !on
    return {
      flex: "1 1 0",
      minWidth: 0,
      maxWidth: 250,
      transform: on ? "scale(1.03)" : off ? "scale(.98)" : "scale(1)",
      opacity: off ? 0.55 : 1,
      filter: off ? "saturate(.7)" : "none",
      transition: "transform .8s cubic-bezier(.34,1.3,.64,1),opacity .8s,filter .8s",
      transformOrigin: who === "teacher" ? "right bottom" : "left bottom",
    }
  }

  return (
    <div
      ref={box}
      role="img"
      aria-label="Two phones. The teacher taps Next page and the lines change to the next page; then the student's phone comes into focus and its lines change to the same page."
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: "clamp(14px,2.6vw,26px)",
        padding: "10px 4px",
      }}
    >
      {/* Teacher: the plain dashboard look */}
      <div style={spot("teacher")}>
        <div
          style={{
            background: "#FFFFFF",
            border: "7px solid #1F2430",
            borderRadius: 28,
            padding: "14px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow:
              focus === "teacher"
                ? "0 0 0 5px rgba(227,176,75,.35), 0 18px 40px rgba(31,36,48,.22)"
                : SHADOW,
            transition: "box-shadow .8s",
            color: "#1F2430",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                background: "#1F2430",
                color: "#FFFFFF",
                ...f(700, "12px", "1", BODY),
              }}
            >
              Teacher
            </span>
            <span style={{ ...f(600, "11px", "1", BODY), color: "#6B7280" }}>
              {t.surah} · p.{t.page}
            </span>
          </div>
          <MushafPage kid={false} page={t} phase={teacherPhase} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                background: tapping ? "#1F2430" : "#FFFFFF",
                color: tapping ? "#FFFFFF" : "#1F2430",
                ...f(600, "12px", "1", BODY),
                transition: "background .2s,color .2s",
                animation: tapping ? "vvTap .5s ease-out" : undefined,
              }}
            >
              Next page <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Student: the kid portal look */}
      <div style={spot("student")}>
        <div
          style={{
            position: "relative",
            background: "#F8F6EE",
            border: "7px solid #2E3A2F",
            borderRadius: 32,
            padding: "14px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow:
              focus === "student"
                ? "0 0 0 5px rgba(227,176,75,.4), 0 18px 40px rgba(46,58,47,.22)"
                : SHADOW,
            transition: "box-shadow .8s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "-14px -12px 0",
              padding: "12px 12px 10px",
              borderRadius: "22px 22px 0 0",
              background: mix("#7FA3B8", 28),
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                background: "#8FA97A",
                ...f(700, "12px", "1", HEAD),
              }}
            >
              <span aria-hidden="true">☾</span> You
            </span>
            <span
              style={{
                padding: "4px 9px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1.5px solid #D9C9B2",
                ...f(700, "11px", "1", HEAD),
                color: "#6B7F5B",
              }}
            >
              {st.surah}
            </span>
          </div>
          <MushafPage kid page={st} phase={studentPhase} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: mix("#E3B04B", 35),
                ...f(700, "12px", "1", HEAD),
                color: "#7A5A12",
              }}
            >
              Page {st.page}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="16" viewBox="0 0 16 18" aria-hidden="true">
                <rect x="4.5" y="1" width="7" height="11" rx="3.5" fill="#2E3A2F" />
                <path
                  d="M2 8.5 Q2 14 8 14 Q14 14 14 8.5 M8 14 V17"
                  fill="none"
                  stroke="#2E3A2F"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span
                aria-hidden="true"
                style={{ display: "flex", gap: 3, height: 14, alignItems: "center" }}
              >
                <Bars
                  color="#7FA3B8"
                  dur=".8s"
                  delays={["0s", ".2s", ".1s", ".3s", ".15s"]}
                  h={14}
                />
              </span>
            </span>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 54,
              transform: `translateX(-50%) translateY(${toast ? 0 : 8}px) scale(${toast ? 1 : 0.9})`,
              opacity: toast ? 1 : 0,
              transition: "opacity .25s,transform .4s cubic-bezier(.34,1.56,.64,1)",
              whiteSpace: "nowrap",
              padding: "8px 12px",
              borderRadius: 999,
              background: "#2E3A2F",
              color: "#F8F6EE",
              ...f(700, "12px", "1", HEAD),
              boxShadow: SHADOW,
            }}
          >
            ✨ Teacher turned the page
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A mushaf page on a phone. The frame never moves: on a page change the old
 * lines drift out one after another, then the new page's lines settle in.
 */
function MushafPage({
  kid,
  page,
  phase,
}: {
  kid: boolean
  page: (typeof MUSHAF_PAGES)[number]
  phase: Phase
}) {
  const line: CSSProperties = {
    height: 38,
    ...ar(600, "clamp(13px,1.5vw,17px)", "38px"),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textAlign: "center",
    color: kid ? "#2E3A2F" : "#1F2430",
  }
  return (
    <div
      lang="ar"
      dir="rtl"
      style={{
        position: "relative",
        background: kid ? "#FBF8EF" : "#FFFFFF",
        borderRadius: kid ? 18 : 8,
        padding: "6px 8px",
        border: kid ? "1.5px solid #D9E2CF" : "1px solid #E3E6EC",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {page.lines.map((l, i) => (
        <div
          key={`${page.page}-${i}`}
          className={phase === "out" ? "line-out" : phase === "in" ? "line-in" : undefined}
          style={{ ...line, animationDelay: `${i * 60}ms` }}
        >
          {l}
        </div>
      ))}
      {/* A soft glow that breathes once while the lines change */}
      <span
        aria-hidden="true"
        className={phase !== "idle" ? "page-glow" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: kid
            ? "radial-gradient(circle at 50% 40%, rgba(227,176,75,.35), transparent 70%)"
            : "radial-gradient(circle at 50% 40%, rgba(31,36,48,.08), transparent 70%)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

/* ── Chapter 10: how to reach us ── */

const CONTACTS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    hint: "Fastest reply",
    href: CONTACT.whatsapp,
    color: "#8FA97A",
    icon: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    ),
  },
  {
    key: "instagram",
    label: "Instagram",
    hint: "Class moments and tips",
    href: CONTACT.instagram,
    color: "#C98A8A",
    icon: (
      <>
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.3" cy="6.7" r="1.3" />
      </>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    hint: "Our page for parents",
    href: CONTACT.facebook,
    color: "#7FA3B8",
    icon: (
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
    ),
  },
]

/** The three ways to reach us; a card without a link is hidden until it is set. */
function ContactCards() {
  const live = CONTACTS.filter((c) => c.href)
  const shown = live.length ? live : CONTACTS
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,160px),1fr))",
        gap: 12,
      }}
    >
      {shown.map((c) => (
        <a
          key={c.key}
          href={c.href || "#"}
          target={c.href ? "_blank" : undefined}
          rel={c.href ? "noopener noreferrer" : undefined}
          className="lift"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "22px 14px 18px",
            borderRadius: 22,
            background: "#121612",
            border: "1.5px solid #2C362C",
            textDecoration: "none",
            color: "#F0ECDE",
            textAlign: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: c.color,
              color: "#121612",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              {c.icon}
            </svg>
          </span>
          <span style={{ ...f(700, "18px", "1.1", HEAD), color: "#F0ECDE" }}>{c.label}</span>
          <span style={{ ...f(600, "13px", "1.3", BODY), color: "rgba(240,236,222,0.65)" }}>
            {c.hint}
          </span>
        </a>
      ))}
    </div>
  )
}

/* ── The page ─────────────────────────────────────────────────────── */

export function WelcomeStory({
  defaultAge = "little",
  namaz = [],
}: {
  defaultAge?: AgeBand
  namaz?: NamazSlide[]
}) {
  const root = useRef<HTMLDivElement>(null)
  const [age, setAge] = useState<AgeBand | null>(null)
  const [chapter, setChapter] = useState(0)
  const [mobile, setMobile] = useState(false)
  const [compact, setCompact] = useState(false)
  const [bubble, setBubble] = useState(true)
  const [scene, setScene] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [letterPlaying, setLetterPlaying] = useState(false)

  // Mutable runtime bits that must not trigger renders (mirrors the mock's class fields).
  const rt = useRef({
    reduced: false,
    raf: 0,
    chapter: 0,
    bubbleT: 0,
    stoneN: -1,
    burstDone: false,
    letT: 0,
    io: null as IntersectionObserver | null,
  })

  const spray = useCallback((host: Element | null, n: number, star: boolean) => {
    if (rt.current.reduced || !host) return
    const cols = ["#E3B04B", "#D98363", "#8FA97A", "#7FA3B8", "#9D8BB5", "#6FA3A0", "#C98A8A"]
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span")
      const c = cols[i % cols.length]
      Object.assign(s.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        pointerEvents: "none",
        zIndex: "6",
        color: c,
        lineHeight: "1",
      })
      if (star) {
        s.textContent = "✦"
        s.style.fontSize = 12 + Math.random() * 16 + "px"
      } else
        Object.assign(s.style, { width: "8px", height: "12px", background: c, borderRadius: "2px" })
      host.appendChild(s)
      const a = Math.random() * Math.PI * 2
      const d = (star ? 80 : 110) + Math.random() * (star ? 60 : 170)
      const x = Math.cos(a) * d
      const y = Math.sin(a) * d - (star ? 0 : 70)
      const r = Math.random() * 600
      const an = s.animate(
        [
          { transform: "translate(0,0) scale(.3) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${x}px,${y}px) scale(1) rotate(${r}deg)`,
            opacity: 1,
            offset: 0.6,
          },
          {
            transform: `translate(${x}px,${y + (star ? 10 : 110)}px) scale(.8) rotate(${r * 1.6}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 1500 + Math.random() * 700,
          easing: "cubic-bezier(.2,.7,.3,1)",
          fill: "forwards",
        },
      )
      an.onfinish = () => s.remove()
    }
  }, [])

  useEffect(() => {
    const r = rt.current
    const el = root.current!
    r.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const de = document.documentElement

    const setLanterns = (n: number) => {
      r.stoneN = n
      el.querySelectorAll<SVGElement>("[data-lantern]").forEach((g, i) =>
        g.classList.toggle("lit", i < n),
      )
      const walker = el.querySelector<SVGElement>("[data-walker]")
      if (walker) {
        const pt = n <= 0 ? roadPoint(0.01) : n >= 30 ? roadPoint(0.985) : LANTERNS[n - 1]
        walker.style.transform = `translate(${pt.x + (n > 0 && n < 30 ? 12 : 0)}px, ${pt.y - 4}px)`
      }
      el.querySelector("[data-mosque]")?.classList.toggle("lit", n >= 30)
      const ring = el.querySelector<SVGCircleElement>("[data-ring]")
      if (ring) ring.style.strokeDashoffset = String(351.9 * (1 - n / 30))
      const num = el.querySelector<HTMLElement>("[data-ring-num]")
      const lab = el.querySelector<HTMLElement>("[data-ring-label]")
      if (num) {
        num.textContent = n >= 30 ? "Khatm!" : String(n)
        num.style.fontSize = n >= 30 ? "30px" : "40px"
      }
      if (lab) lab.style.opacity = n >= 30 ? "0" : "1"
      if (n >= 30 && !r.burstDone) {
        r.burstDone = true
        spray(el.querySelector("[data-burst]"), 22, true)
      }
    }

    const tick = () => {
      const vh = window.innerHeight
      const sy = window.scrollY
      const max = de.scrollHeight - vh
      const p = max > 0 ? Math.min(1, sy / max) : 0
      const c7 = document.getElementById("ch7")
      const c10 = document.getElementById("ch10")
      let t = 0
      if (c7 && c10) {
        const a = c7.offsetTop - vh * 0.7
        const b = c10.offsetTop - vh * 0.55
        t = clamp((sy - a) / (b - a))
      }
      const seg = t * (SKY.length - 1)
      const i = Math.min(SKY.length - 2, Math.floor(seg))
      const fr = seg - i
      const col = SKY[i].map((v, k) => Math.round(v + (SKY[i + 1][k] - v) * fr))
      de.style.setProperty("--sky", `rgb(${col.join(",")})`)
      const night = t > 0.6
      de.style.setProperty("--ink", night ? "#F0ECDE" : "#2E3A2F")
      de.style.setProperty("--bar", night ? "rgba(18,22,18,0.82)" : "rgba(248,246,238,0.82)")
      de.style.setProperty("--barline", night ? "rgba(240,236,222,0.12)" : "rgba(46,58,47,0.08)")
      de.style.setProperty("--navline", night ? "rgba(240,236,222,0.25)" : "#D9C9B2")
      de.style.setProperty("--navoff", night ? "rgba(240,236,222,0.35)" : "#D9C9B2")
      de.style.setProperty("--stars", String(clamp((t - 0.4) / 0.5)))
      const pb = el.querySelector<HTMLElement>("[data-progress]")
      if (pb) pb.style.transform = `scaleX(${p})`
      const hl = el.querySelector<HTMLElement>("[data-hilal]")
      if (hl && !r.reduced) hl.style.transform = `rotate(${(Math.sin(sy / 260) * 8).toFixed(2)}deg)`
      let act = 0
      el.querySelectorAll("[data-chapter]").forEach((s, k) => {
        if (s.getBoundingClientRect().top < vh * 0.45) act = k
      })
      if (max - sy < 4) act = 9
      if (act !== r.chapter) {
        r.chapter = act
        setChapter(act)
        setBubble(true)
        clearTimeout(r.bubbleT)
        r.bubbleT = window.setTimeout(() => setBubble(false), 3500)
      }
      const st = el.querySelector("[data-road]")
      if (st) {
        const rect = st.getBoundingClientRect()
        const n = r.reduced
          ? 30
          : Math.round(clamp((vh * 0.85 - rect.top) / (rect.height + vh * 0.2)) * 30)
        // Lanterns stay lit: scrolling back up never un-reads a para.
        if (n > r.stoneN) setLanterns(n)
      }
    }

    const fire = (node: HTMLElement, instant: boolean) => {
      const k = node.dataset.trigger
      if (!k) return
      if (k === "streak") {
        const num = node.querySelector<HTMLElement>("[data-num]")
        if (!num) return
        if (instant) {
          num.textContent = "30"
          return
        }
        let i = 0
        const iv = setInterval(() => {
          i++
          num.textContent = String(i)
          if (i >= 30) clearInterval(iv)
        }, 45)
      }
      if (k === "confetti" && !instant) setTimeout(() => spray(node, 60, false), 500)
      if (k === "medal") {
        node.style.opacity = "1"
        if (!instant)
          node.animate(
            [
              { transform: "translateY(-200px)", offset: 0 },
              { transform: "translateY(0)", offset: 0.5 },
              { transform: "translateY(-34px)", offset: 0.68 },
              { transform: "translateY(0)", offset: 0.82 },
              { transform: "translateY(-9px)", offset: 0.92 },
              { transform: "translateY(0)", offset: 1 },
            ],
            { duration: 1200, easing: "ease-in" },
          )
      }
    }

    const setupReveal = () => {
      const els = el.querySelectorAll<HTMLElement>("[data-reveal],[data-from],[data-trigger]")
      const ease = "cubic-bezier(.34,1.56,.64,1)"
      if (r.reduced || !("IntersectionObserver" in window)) {
        els.forEach((n) => {
          if (n.dataset.to) n.style.transform = n.dataset.to
          if (n.dataset.endop) n.style.opacity = n.dataset.endop
          fire(n, true)
        })
        return
      }
      els.forEach((n) => {
        const d = n.dataset.delay || 0
        if (n.hasAttribute("data-reveal")) {
          n.style.opacity = "0"
          n.style.transform = "translateY(16px)"
          n.style.transition = `opacity 500ms ${ease} ${d}ms, transform 500ms ${ease} ${d}ms`
        } else if (n.dataset.from) {
          const dur = n.dataset.dur || 700
          n.style.transform = n.dataset.from
          if (n.hasAttribute("data-fade")) n.style.opacity = "0"
          n.style.transition = `transform ${dur}ms ${n.dataset.ease || ease} ${d}ms, opacity ${n.dataset.endop ? dur : Math.min(Number(dur), 500)}ms ease ${d}ms`
        } else if (n.dataset.trigger === "medal") n.style.opacity = "0"
      })
      const reveal = (n: HTMLElement) => {
        if (n.hasAttribute("data-reveal")) {
          n.style.opacity = "1"
          n.style.transform = "none"
        } else if (n.dataset.from) {
          n.style.transform = n.dataset.to || "none"
          n.style.opacity = n.dataset.endop || "1"
        }
        fire(n, false)
      }
      r.io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return
            const n = e.target as HTMLElement
            r.io?.unobserve(n)
            // A group reveals all its children at once. Needed where a child's
            // start position is outside its clipped section (the flying letters
            // begin 400px off to the side), so the child itself never intersects.
            if (n.hasAttribute("data-reveal-group"))
              n.querySelectorAll<HTMLElement>("[data-from],[data-reveal]").forEach(reveal)
            else reveal(n)
          }),
        { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
      )
      const groups = el.querySelectorAll<HTMLElement>("[data-reveal-group]")
      els.forEach((n) => {
        if (![...groups].some((g) => g.contains(n))) r.io!.observe(n)
      })
      groups.forEach((g) => r.io!.observe(g))
    }

    const onResize = () => {
      const w = window.innerWidth
      setMobile(w < 760)
      setCompact(w < 1120)
    }
    onResize()
    window.addEventListener("resize", onResize)
    const onScroll = () => {
      if (!r.raf)
        r.raf = requestAnimationFrame(() => {
          r.raf = 0
          tick()
        })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    r.bubbleT = window.setTimeout(() => setBubble(false), 5500)
    const boot = window.setTimeout(() => {
      setupReveal()
      tick()
    }, 60)

    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(r.raf)
      r.io?.disconnect()
      clearTimeout(r.bubbleT)
      clearTimeout(boot)
      ;["--sky", "--ink", "--bar", "--barline", "--navline", "--navoff", "--stars"].forEach((p) =>
        de.style.removeProperty(p),
      )
    }
  }, [spray])

  /* ── Derived values (the mock's renderVals) ── */
  const curAge = age || defaultAge
  const headline = HEADLINES[curAge]
  const ch = chapter
  const mood =
    ch === 0
      ? ({ little: "excited", young: "awake", teens: "wink" } as const)[curAge]
      : ch === 6
        ? "excited"
        : ch === 9
          ? "sleepy"
          : "awake"
  const face = {
    eyeL: mood === "awake" || mood === "wink" ? 1 : 0,
    eyeR: mood === "awake" ? 1 : 0,
    happy: mood === "excited" ? 1 : 0,
    wink: mood === "wink" ? 1 : 0,
    sleep: mood === "sleepy" ? 1 : 0,
    smile: mood === "awake" || mood === "wink" ? 1 : 0,
    grin: mood === "excited" ? 1 : 0,
  }
  const sc = SCENES[scene]
  const toggleFlip = () => setFlipped((v) => !v)

  const pill = (bg: string): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "#FFFFFF",
    border: `1.5px solid ${bg}`,
    borderRadius: 999,
    ...f(600, "14px", "1.2", BODY),
  })
  const section = (extra: CSSProperties): CSSProperties => ({
    scrollMarginTop: 96,
    maxWidth: 1180,
    width: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
    borderRadius: 32,
    overflow: "hidden",
    padding: "clamp(28px,5vw,64px)",
    boxShadow: SHADOW,
    ...extra,
  })
  const col = (gap = 14): CSSProperties => ({ display: "flex", flexDirection: "column", gap })
  const footLink: CSSProperties = {
    ...f(600, "15px", "1", BODY),
    color: "#F0ECDE",
    textDecoration: "none",
  }

  return (
    <div
      ref={root}
      className="vvw"
      style={{ color: "#2E3A2F", fontFamily: BODY, WebkitFontSmoothing: "antialiased" }}
      onClick={(e) => {
        // In-page links ("Book a free trial" → #ch10, the chapter dots, the logo)
        // scroll smoothly without writing "#ch10" into the address bar.
        const a = (e.target as HTMLElement).closest("a[href^='#']")
        if (!a) return
        const target = document.getElementById(a.getAttribute("href")!.slice(1))
        if (!target) return
        e.preventDefault()
        target.scrollIntoView({ behavior: "smooth", block: "start" })
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Ambient: colour clouds, stars (fade in at dusk), drifting doodles */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {(
          [
            ["-10%", "-10%", undefined, undefined, "55vw", "#8FA97A", 0.16],
            [undefined, "10%", "-12%", undefined, "50vw", "#E3B04B", 0.14],
            ["20%", "45%", undefined, undefined, "45vw", "#9D8BB5", 0.12],
            [undefined, undefined, "5%", "-15%", "50vw", "#7FA3B8", 0.14],
            ["-5%", undefined, undefined, "-5%", "35vw", "#D98363", 0.1],
          ] as const
        ).map(([left, top, right, bottom, size, c, op], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              right,
              bottom,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle,${c},transparent 65%)`,
              opacity: op,
              filter: "blur(40px)",
            }}
          />
        ))}
        <div
          style={{ position: "absolute", inset: 0, opacity: "var(--stars,0)" as unknown as number }}
        >
          {STARS.map((st, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${st.x}%`,
                top: `${st.y}%`,
                width: `${st.s}px`,
                height: `${st.s}px`,
                borderRadius: "50%",
                background: "#E3B04B",
                animation: `vvTwinkle ${st.d}s ease-in-out ${st.dl}s infinite`,
              }}
            />
          ))}
        </div>
        {DOODLES.map((dd, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${dd.x}%`,
              top: `${dd.y}%`,
              fontSize: dd.s,
              lineHeight: 1,
              color: dd.c,
              opacity: 0.55,
              animation: `vvFloat ${dd.d}s ease-in-out ${dd.dl}s infinite`,
            }}
          >
            {dd.g}
          </span>
        ))}
      </div>

      {/* Sticky top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--bar,rgba(248,246,238,0.82))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--barline,rgba(46,58,47,0.08))",
          transition: "background .4s",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "12px clamp(16px,3vw,32px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px 20px",
            flexWrap: mobile ? "wrap" : "nowrap",
          }}
        >
          <a
            href="#ch1"
            aria-label="Verse & Voice, back to top"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--ink,#2E3A2F)",
            }}
          >
            <Logo size={44} id="lgA" label="Verse & Voice logo: an open book with voice waves" />
            <span style={{ ...f(700, "23px", "1", HEAD), whiteSpace: "nowrap" }}>
              Verse{" "}
              <span style={{ fontWeight: 600, fontStyle: "italic", color: "#C96F4F" }}>&amp;</span>{" "}
              Voice
            </span>
          </a>
          <div
            role="group"
            aria-label="Choose an age group"
            style={{
              order: mobile ? 3 : 0,
              flex: mobile ? "1 1 100%" : "0 1 auto",
              display: "flex",
              justifyContent: "center",
              padding: 4,
              gap: 4,
              background: "#FFFFFF",
              border: "1.5px solid #D9C9B2",
              borderRadius: 999,
            }}
          >
            {AGES.map(([k, l, rng]) => {
              const on = curAge === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${l} ${rng}`}
                  onClick={() => {
                    setAge(k)
                    setBubble(true)
                  }}
                  style={{
                    flex: 1,
                    border: 0,
                    cursor: "pointer",
                    borderRadius: 999,
                    padding: "9px 16px",
                    background: on ? "#2E3A2F" : "transparent",
                    color: on ? "#F8F6EE" : "#2E3A2F",
                    ...f(700, "14px", "1", BODY),
                    whiteSpace: "nowrap",
                    transition: "background .25s,color .25s",
                  }}
                >
                  {compact ? `${l.split(" ")[0]} ${rng}` : `${l} ${rng}`}
                </button>
              )
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Kids login: the student portal's own door, right in the top bar */}
            <Link
              href="/login"
              className="lift"
              aria-label="Kids login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: mobile ? 46 : 58,
                padding: mobile ? "0 12px" : "0 20px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1.5px solid #D9C9B2",
                color: "#2E3A2F",
                ...f(700, "17px", "1", HEAD),
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: SHADOW,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true">
                <path
                  d="M62 14a38 38 0 1 0 22 58A32 32 0 0 1 62 14z"
                  fill="#E3B04B"
                  stroke="#2E3A2F"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <circle cx="36" cy="48" r="4.5" fill="#2E3A2F" />
                <circle cx="52" cy="54" r="4.5" fill="#2E3A2F" />
                <path
                  d="M36 64q8 8 16 0"
                  fill="none"
                  stroke="#2E3A2F"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
              {!mobile && (compact ? "Login" : "Kids login")}
            </Link>
            <SunrisePill
              href="#ch10"
              label={compact ? "Free trial" : "Book a free trial"}
              h={mobile ? 46 : 58}
              pad={mobile ? 36 : 46}
              size="17px"
            />
          </div>
        </div>
        {mobile && (
          <div style={{ height: 3, background: "rgba(217,201,178,.4)" }}>
            <div
              data-progress=""
              style={{
                height: "100%",
                background: "linear-gradient(90deg,#8FA97A,#E3B04B)",
                transformOrigin: "left",
                transform: "scaleX(0)",
              }}
            />
          </div>
        )}
      </header>

      {/* Chapter dots (desktop) */}
      {!mobile && (
        <nav
          aria-label="Chapters"
          style={{
            position: "fixed",
            left: 22,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 6,
              bottom: 6,
              left: "50%",
              width: 2,
              marginLeft: -1,
              background: "var(--navline,#D9C9B2)",
              borderRadius: 2,
            }}
          />
          {NAV.map((t, i) => (
            <a
              key={t}
              href={`#ch${i + 1}`}
              title={t}
              aria-label={`Chapter ${i + 1}: ${t}`}
              aria-current={i === ch ? "step" : undefined}
              style={{
                position: "relative",
                display: "block",
                width: 16,
                height: 13,
                borderRadius: "50%",
                background: i === ch ? "#E3B04B" : i < ch ? "#8FA97A" : "var(--navoff,#D9C9B2)",
                boxShadow: i === ch ? "0 0 0 4px rgba(227,176,75,.28)" : "none",
                transform: `scale(${i === ch ? 1.45 : 1})`,
                transition: "transform .3s cubic-bezier(.34,1.56,.64,1),background .3s",
              }}
            />
          ))}
        </nav>
      )}

      {/* Hilal, the crescent moon mascot */}
      <div
        style={{
          position: "fixed",
          right: "clamp(10px,2vw,26px)",
          bottom: "clamp(10px,2vw,22px)",
          zIndex: 25,
          width: mobile ? 64 : 92,
          height: mobile ? 64 : 92,
          animation: "vvPop .8s cubic-bezier(.34,1.56,.64,1) .5s both",
          pointerEvents: "none",
        }}
      >
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: "92%",
            right: "55%",
            background: "#FFFFFF",
            color: "#2E3A2F",
            padding: "9px 14px",
            borderRadius: "18px 18px 4px 18px",
            ...f(700, "15px", "1.2", HEAD),
            whiteSpace: "nowrap",
            boxShadow: SHADOW,
            opacity: bubble ? 1 : 0,
            transform: `translateY(${bubble ? 0 : 8}px) scale(${bubble ? 1 : 0.9})`,
            transformOrigin: "bottom right",
            transition: "opacity .3s,transform .4s cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          {ch === 0 ? BUBBLES[0] : BUBBLES[ch]}
        </div>
        <div style={{ width: "100%", height: "100%", animation: "vvBob 4s ease-in-out infinite" }}>
          <div
            data-hilal=""
            style={{ width: "100%", height: "100%", transition: "transform .3s ease-out" }}
          >
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              role="img"
              aria-label={`Hilal the crescent moon mascot, looking ${mood}`}
            >
              <defs>
                <mask id="hilalMask">
                  <rect width="100" height="100" fill="#FFFFFF" />
                  <circle cx="66" cy="38" r="34" fill="#000000" />
                </mask>
              </defs>
              <circle cx="48" cy="52" r="40" fill="#E3B04B" mask="url(#hilalMask)" />
              <circle cx="15" cy="70" r="3.6" fill="#D98363" opacity=".45" />
              <circle cx="37" cy="73" r="3.6" fill="#D98363" opacity=".45" />
              <circle cx="21" cy="62" r="3" fill="#2E3A2F" opacity={face.eyeL} />
              <circle cx="32" cy="64" r="3" fill="#2E3A2F" opacity={face.eyeR} />
              <path
                d="M17.5 63 Q21 58 24.5 63 M28.5 65 Q32 60 35.5 65"
                fill="none"
                stroke="#2E3A2F"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={face.happy}
              />
              <path
                d="M28.5 64 Q32 61 35.5 64"
                fill="none"
                stroke="#2E3A2F"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={face.wink}
              />
              <path
                d="M17.5 61 Q21 65 24.5 61 M28.5 63 Q32 67 35.5 63"
                fill="none"
                stroke="#2E3A2F"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={face.sleep}
              />
              <path
                d="M21 71 Q27 77 33 73"
                fill="none"
                stroke="#2E3A2F"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={face.smile}
              />
              <path d="M20 70.5 Q27 82 34.5 72 Z" fill="#2E3A2F" opacity={face.grin} />
              <g opacity={face.sleep}>
                <circle cx="27" cy="74" r="1.8" fill="#2E3A2F" />
                <text x="56" y="22" fontFamily={HEAD} fontWeight="700" fontSize="12" fill="#F0ECDE">
                  z
                </text>
                <text x="67" y="12" fontFamily={HEAD} fontWeight="700" fontSize="16" fill="#F0ECDE">
                  Z
                </text>
                <g transform="translate(74 84)">
                  <rect x="-4" y="-4" width="8" height="8" fill="#F0ECDE" />
                  <rect x="-4" y="-4" width="8" height="8" fill="#F0ECDE" transform="rotate(45)" />
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 clamp(16px,6vw,84px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(56px,8vw,104px)",
        }}
      >
        {/* ── 1. Dawn ── */}
        <section
          id="ch1"
          data-chapter=""
          aria-labelledby="h-ch1"
          style={{
            scrollMarginTop: 96,
            maxWidth: 1180,
            width: "100%",
            margin: "0 auto",
            minHeight: "calc(100vh - 100px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))",
            alignItems: "center",
            gap: "clamp(32px,5vw,64px)",
            paddingTop: "clamp(24px,4vw,48px)",
          }}
        >
          <div data-reveal="" style={col(22)}>
            <span style={eyebrow("#6B7F5B")}>Chapter 1 · Dawn</span>
            <h1
              id="h-ch1"
              style={
                {
                  margin: 0,
                  ...f(700, "clamp(42px,6.4vw,78px)", "1.02", HEAD),
                  color: "#2E3A2F",
                  textWrap: "balance",
                } as CSSProperties
              }
            >
              {headline}
            </h1>
            <p
              style={
                {
                  margin: 0,
                  maxWidth: 520,
                  ...f(400, "clamp(18px,1.6vw,21px)", "1.6", BODY),
                  color: "#2E3A2F",
                  textWrap: "pretty",
                } as CSSProperties
              }
            >
              Live one-to-one Quran classes for kids and teens, by voice, with a teacher who
              listens.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <SunrisePill href="#ch10" label="Book a free trial" delay=".8s" />
              <a
                href="#ch2"
                className="lift lift-dark"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 58,
                  padding: "0 28px",
                  borderRadius: 999,
                  background: "#FFFFFF",
                  border: "1.5px solid #D9C9B2",
                  color: "#6B7F5B",
                  ...f(700, "19px", "1", HEAD),
                  textDecoration: "none",
                }}
              >
                Peek inside
              </a>
            </div>
            <ul
              style={{
                listStyle: "none",
                margin: "6px 0 0",
                padding: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {[
                ["🎙", "Voice-only, no cameras"],
                ["🎓", "Qualified teachers"],
                ["🕰", "Your timezone"],
                ["📈", "Progress parents can see"],
              ].map(([e, t]) => (
                <li key={t} style={pill("#D9C9B2")}>
                  <span aria-hidden="true">{e}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div
            data-reveal=""
            data-delay="150"
            style={{ position: "relative", display: "grid", placeItems: "center" }}
          >
            <div
              style={{
                position: "relative",
                width: "min(100%,460px)",
                aspectRatio: "1/1",
                borderRadius: 32,
                background: "#FFFFFF",
                border: "1.5px solid #E7DCCB",
                boxShadow: SHADOW,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: "72%",
                  aspectRatio: "1/1",
                  borderRadius: "50%",
                  background: "radial-gradient(circle,#F1E8DA,#E9DCC8)",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "12%",
                  top: "14%",
                  fontSize: 22,
                  color: "#E3B04B",
                  animation: "vvFloat 5s ease-in-out infinite",
                }}
              >
                ✦
              </span>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: "14%",
                  top: "20%",
                  fontSize: 26,
                  color: "#9D8BB5",
                  animation: "vvFloat 6s ease-in-out 1s infinite",
                }}
              >
                ☾
              </span>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: "18%",
                  bottom: "16%",
                  fontSize: 30,
                  color: "#7FA3B8",
                  animation: "vvFloat 7s ease-in-out .5s infinite",
                }}
              >
                ☁
              </span>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "18%",
                  bottom: "20%",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#D98363",
                  animation: "vvFloat 4.5s ease-in-out infinite",
                }}
              />
              {/* The real letter, in the mushaf face the children read. It "writes"
                  itself top to bottom over a faint tracing guide. */}
              <div
                role="img"
                aria-label="The Arabic letter Alif writing itself"
                lang="ar"
                style={{
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  width: "40%",
                  aspectRatio: "1/1.6",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    gridArea: "1 / 1",
                    ...ar(700, "clamp(170px,25vw,290px)", "1"),
                    color: "#D9C9B2",
                    transform: "translate(3px,4px)",
                  }}
                >
                  ا
                </span>
                <span
                  className="alif-write"
                  style={{
                    gridArea: "1 / 1",
                    ...ar(700, "clamp(170px,25vw,290px)", "1"),
                    color: "#2E3A2F",
                  }}
                >
                  ا
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 22,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  ...f(700, "16px", "1", HEAD),
                  color: "#6B7F5B",
                }}
              >
                ا · Alif, the very first letter
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  animation: "vvFloat 6s ease-in-out infinite",
                }}
              >
                <Logo
                  size={76}
                  id="lgB"
                  label="Talking Verse & Voice logo"
                  style={{ filter: "drop-shadow(0 6px 14px rgba(46,58,47,.14))" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. The first letters ── */}
        <section
          id="ch2"
          data-chapter=""
          aria-labelledby="h-ch2"
          style={section({
            background: mix("#8FA97A", 18),
            border: `1.5px solid ${mix("#8FA97A", 45)}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))",
            gap: "clamp(32px,5vw,56px)",
            alignItems: "center",
          })}
        >
          <div data-reveal="" style={col()}>
            <span style={eyebrow("#4F6343")}>Chapter 2</span>
            <h2 id="h-ch2" style={{ ...h2(), color: "#2E3A2F" }}>
              The first letters
            </h2>
            <p style={{ ...para(), color: "#2E3A2F" }}>
              We begin with Norani Qaida. Every letter has a sound, every sound has a shape. Your
              teacher listens, corrects gently, and celebrates the first time you get it right.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
            <div
              data-reveal-group=""
              dir="rtl"
              lang="ar"
              aria-label="Arabic letters Alif, Baa, Taa, Thaa, Jeem"
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: "clamp(10px,3vw,26px)",
                borderBottom: "3px solid #2E3A2F",
                paddingBottom: 4,
              }}
            >
              {(
                [
                  ["ا", "translate(380px,-80px) rotate(30deg)", 0, "#2E3A2F"],
                  ["ب", "translate(420px,-120px) rotate(-20deg)", 120, "#C96F4F"],
                  ["ت", "translate(0,-160px) rotate(25deg)", 240, "#2E3A2F"],
                  ["ث", "translate(-420px,-120px) rotate(20deg)", 360, "#2E3A2F"],
                  ["ج", "translate(-380px,-80px) rotate(-30deg)", 480, "#2E3A2F"],
                ] as const
              ).map(([l, from, d, c]) => (
                <span
                  key={l}
                  data-from={from}
                  data-fade=""
                  data-delay={d}
                  data-dur="900"
                  style={{
                    display: "inline-block",
                    ...ar(600, "clamp(52px,7vw,80px)", "1.4"),
                    color: c,
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
            <div
              data-reveal=""
              data-delay="300"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: "#FFFFFF",
                border: `1.5px solid ${mix("#8FA97A", 45)}`,
                borderRadius: 24,
                padding: "16px 20px",
                boxShadow: SHADOW,
              }}
            >
              <span
                lang="ar"
                style={{
                  ...ar(600, "64px", "1.5"),
                  color: "#C96F4F",
                  width: 72,
                  textAlign: "center",
                }}
              >
                ب
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={f(700, "20px", "1", HEAD)}>Baa</span>
                <span style={{ ...f(600, "14px", "1", BODY), color: "#4F6343" }}>
                  Say it with me
                </span>
                <div
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    gap: 3,
                    height: 16,
                    alignItems: "center",
                    opacity: letterPlaying ? 1 : 0.25,
                    transition: "opacity .2s",
                  }}
                >
                  <Bars color="#8FA97A" dur=".7s" delays={["0s", ".1s", ".2s", ".3s", ".15s"]} />
                </div>
              </div>
              <button
                type="button"
                className="press"
                onClick={() => {
                  setLetterPlaying(true)
                  clearTimeout(rt.current.letT)
                  rt.current.letT = window.setTimeout(() => setLetterPlaying(false), 1400)
                }}
                aria-label="Play the sound of Baa"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: 0,
                  cursor: "pointer",
                  background: "#2E3A2F",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5 L19 12 L8 19 Z" fill="#F8F6EE" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. A voice on the line ── */}
        <section
          id="ch3"
          data-chapter=""
          aria-labelledby="h-ch3"
          style={section({
            background: mix("#7FA3B8", 18),
            border: `1.5px solid ${mix("#7FA3B8", 45)}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))",
            gap: "clamp(32px,5vw,56px)",
            alignItems: "center",
          })}
        >
          <div data-reveal="" style={col()}>
            <span style={eyebrow("#3F6478")}>Chapter 3</span>
            <h2 id="h-ch3" style={h2()}>
              A voice on the line
            </h2>
            <p style={para()}>
              Your teacher turns the page and it turns on your screen. Classes are voice only, so
              your child&apos;s camera is never part of the lesson. Parents are welcome to sit
              beside them.
            </p>
            <span
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                background: "#FFFFFF",
                border: `1.5px solid ${mix("#7FA3B8", 45)}`,
                borderRadius: 999,
                ...f(700, "15px", "1", BODY),
              }}
            >
              🎙 Audio only · 📷 Never
            </span>
          </div>
          <div data-reveal="" data-delay="150">
            <PageTurnDemo />
          </div>
        </section>

        {/* ── 4. Para by para: the lantern road ── */}
        <section
          id="ch4"
          data-chapter=""
          aria-labelledby="h-ch4"
          style={section({
            background: mix("#8FA97A", 32),
            border: `1.5px solid ${mix("#8FA97A", 60)}`,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(24px,4vw,40px)",
          })}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 28,
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div data-reveal="" style={{ ...col(), maxWidth: 560 }}>
              <span style={eyebrow("#3E5234")}>Chapter 4</span>
              <h2 id="h-ch4" style={h2()}>
                Para by para
              </h2>
              <p style={para()}>
                One para at a time, and every para lights another lantern on the road. Tajweed notes
                from your teacher after every lesson, a celebration at every milestone, and a
                certificate at the end.
              </p>
            </div>
            <div
              role="img"
              aria-label="Progress ring counting paras from 1 to 30"
              style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}
            >
              <svg
                viewBox="0 0 140 140"
                width="150"
                height="150"
                aria-hidden="true"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle cx="70" cy="70" r="56" fill="#FFFFFF" stroke="#D9C9B2" strokeWidth="12" />
                <circle
                  data-ring=""
                  cx="70"
                  cy="70"
                  r="56"
                  fill="none"
                  stroke="#E3B04B"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="351.9"
                  strokeDashoffset="351.9"
                  style={{ transition: "stroke-dashoffset .3s" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  data-ring-label=""
                  style={{
                    ...f(700, "13px", "1", BODY),
                    color: "#4F6343",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Para
                </span>
                <span
                  data-ring-num=""
                  style={{ ...f(700, "40px", "1.05", HEAD), color: "#2E3A2F" }}
                >
                  0
                </span>
              </div>
            </div>
          </div>
          <div
            data-road=""
            data-reveal=""
            data-delay="150"
            role="img"
            aria-label="A winding road to a mosque with thirty lanterns, one per para, lighting up as you read; Hilal the moon walks along it"
            style={{ position: "relative", width: "100%" }}
          >
            {/* ponytail: one landscape scene at every width; lanterns get small on phones. Upgrade: a taller viewBox below 640px. */}
            <svg
              viewBox={`0 0 ${ROAD.w} ${ROAD.h}`}
              width="100%"
              aria-hidden="true"
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#E3B04B" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#E3B04B" stopOpacity="0" />
                </radialGradient>
                <mask id="walkerMask">
                  <rect x="-20" y="-20" width="40" height="40" fill="#FFFFFF" />
                  <circle cx="6" cy="-6" r="10" fill="#000000" />
                </mask>
              </defs>
              {/* sky bits and hills */}
              <circle cx="92" cy="64" r="26" fill="#E3B04B" opacity=".3" />
              <circle cx="92" cy="64" r="16" fill="#E3B04B" opacity=".45" />
              <ellipse cx="150" cy="430" rx="330" ry="110" fill={mix("#8FA97A", 55)} />
              <ellipse cx="520" cy="440" rx="300" ry="100" fill={mix("#8FA97A", 45)} />
              {/* the road */}
              <path
                d={ROAD_D}
                fill="none"
                stroke="#D9C9B2"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={ROAD_D}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeDasharray="6 10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity=".8"
              />
              {/* the mosque at the end of the road */}
              <g
                data-mosque=""
                className="mosque"
                transform={`translate(${MOSQUE.x} ${MOSQUE.base})`}
              >
                <circle className="domeglow" cx="0" cy="-48" r="54" fill="url(#lanternGlow)" />
                <rect
                  x="-58"
                  y="-46"
                  width="116"
                  height="46"
                  rx="4"
                  fill="#FFFFFF"
                  stroke="#2E3A2F"
                  strokeWidth="2.5"
                />
                <path d="M-62 -46 h124" stroke="#2E3A2F" strokeWidth="2.5" strokeLinecap="round" />
                <path
                  className="dome"
                  d="M-34 -46 C -34 -92, 34 -92, 34 -46 Z"
                  stroke="#2E3A2F"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path d="M0 -84 v-10" stroke="#2E3A2F" strokeWidth="2.5" strokeLinecap="round" />
                <path
                  d="M3 -99 a6 6 0 1 0 0 10 a4.5 4.5 0 1 1 0 -10z"
                  fill="#E3B04B"
                  stroke="#2E3A2F"
                  strokeWidth="1.5"
                />
                {[-76, 76].map((mx) => (
                  <g key={mx} transform={`translate(${mx} 0)`}>
                    <rect
                      x="-6"
                      y="-92"
                      width="12"
                      height="92"
                      rx="3"
                      fill="#FFFFFF"
                      stroke="#2E3A2F"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M-9 -92 C -9 -106, 9 -106, 9 -92 Z"
                      fill="#E3B04B"
                      stroke="#2E3A2F"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <rect x="-9" y="-64" width="18" height="4" rx="2" fill="#2E3A2F" />
                  </g>
                ))}
                <path d="M-10 0 v-16 a10 10 0 0 1 20 0 v16 z" fill="#2E3A2F" />
                <path
                  d="M-40 -14 a5 5 0 0 1 10 0 v10 h-10z M30 -14 a5 5 0 0 1 10 0 v10 h-10z"
                  fill="#8FA97A"
                  stroke="#2E3A2F"
                  strokeWidth="1.5"
                />
                <g className="star" transform="translate(0 -100)">
                  <rect x="-7" y="-7" width="14" height="14" fill="#E3B04B" />
                  <rect
                    x="-7"
                    y="-7"
                    width="14"
                    height="14"
                    fill="#E3B04B"
                    transform="rotate(45)"
                  />
                </g>
              </g>
              {/* thirty lanterns, one per para */}
              {LANTERNS.map((l, i) => {
                const h = l.milestone ? 40 : 28
                const bw = l.milestone ? 14 : 10
                const bh = l.milestone ? 18 : 13
                return (
                  <g
                    key={i}
                    data-lantern=""
                    className="lantern"
                    transform={`translate(${l.x.toFixed(1)} ${(l.y - 8).toFixed(1)})`}
                  >
                    <circle
                      className="glow"
                      cx="0"
                      cy={-h - bh / 2}
                      r={l.milestone ? 26 : 18}
                      fill="url(#lanternGlow)"
                    />
                    <path
                      d={`M0 0 v${-h}`}
                      stroke="#2E3A2F"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <rect
                      className="body"
                      x={-bw / 2}
                      y={-h - bh}
                      width={bw}
                      height={bh}
                      rx="3"
                      stroke="#2E3A2F"
                      strokeWidth="1.8"
                    />
                    <path
                      d={`M${-bw / 2 - 1} ${-h - bh} h${bw + 2}`}
                      stroke="#2E3A2F"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <ellipse
                      className="flame"
                      cx="0"
                      cy={-h - bh / 2 + 1}
                      rx={bw * 0.22}
                      ry={bh * 0.3}
                      fill="#FFFFFF"
                      opacity="0"
                    />
                    {l.milestone && (
                      <path
                        d={`M0 ${-h - bh - 2} v-12 l12 4 -12 4`}
                        fill="#D98363"
                        stroke="#2E3A2F"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                )
              })}
              {/* Hilal walks the road */}
              <g
                data-walker=""
                style={{
                  transform: `translate(${roadPoint(0.01).x}px, ${roadPoint(0.01).y - 4}px)`,
                  transition: "transform .7s cubic-bezier(.34,1.3,.64,1)",
                }}
              >
                <g transform="translate(0 -16)">
                  <circle cx="0" cy="0" r="14" fill="#E3B04B" mask="url(#walkerMask)" />
                  <circle cx="-7" cy="2" r="1.8" fill="#2E3A2F" />
                  <circle cx="-1" cy="4" r="1.8" fill="#2E3A2F" />
                  <path
                    d="M-8 8 q5 5 10 0"
                    fill="none"
                    stroke="#2E3A2F"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="-11" cy="7" r="2" fill="#D98363" opacity=".5" />
                </g>
              </g>
            </svg>
            <div
              data-burst=""
              aria-hidden="true"
              style={{ position: "absolute", left: "87.5%", top: "28%", width: 1, height: 1 }}
            />
          </div>
        </section>

        {/* ── 5. Words that stay ── */}
        <section
          id="ch5"
          data-chapter=""
          aria-labelledby="h-ch5"
          style={section({
            background: "#FFFFFF",
            border: `1.5px solid ${mix("#9D8BB5", 35)}`,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(28px,4vw,44px)",
          })}
        >
          <div data-reveal="" style={{ ...col(), maxWidth: 640 }}>
            <span style={eyebrow("#5E4E78")}>Chapter 5</span>
            <h2 id="h-ch5" style={h2()}>
              Words that stay
            </h2>
            <p style={para()}>
              Short surahs in small chunks, revised on a schedule, so they stay. Plus a hadith a
              week, with its meaning, in words a child understands.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))",
              gap: 24,
            }}
          >
            <div
              style={{
                borderRadius: 28,
                padding: "clamp(20px,3vw,32px)",
                background: mix("#9D8BB5", 22),
                border: `1.5px solid ${mix("#9D8BB5", 50)}`,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ margin: 0, ...f(700, "24px", "1.1", HEAD) }}>
                  Memorize: Surah Al-Ikhlas
                </h3>
                <span style={{ ...f(600, "14px", "1", BODY), color: "#5E4E78" }}>4 chunks</span>
              </div>
              <div
                lang="ar"
                dir="rtl"
                style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}
              >
                {(
                  [
                    ["translate(-60px,-24px) rotate(-7deg)", 0, "#FFFFFF", 4],
                    ["translate(70px,10px) rotate(6deg)", 150, mix("#9D8BB5", 35), 3],
                    ["translate(-50px,20px) rotate(5deg)", 300, "#FFFFFF", 2],
                    ["translate(60px,34px) rotate(-6deg)", 450, mix("#9D8BB5", 35), 1],
                  ] as const
                ).map(([from, d, bg, z], i) => (
                  <div
                    key={i}
                    data-from={from}
                    data-fade=""
                    data-delay={d}
                    data-dur="800"
                    style={{
                      position: "relative",
                      background: bg,
                      border: "1.5px solid #9D8BB5",
                      borderRadius: 16,
                      padding: "6px 18px",
                      ...ar(600, "26px", "2"),
                      textAlign: "center",
                      zIndex: z,
                    }}
                  >
                    {IKHLAS[i]}
                    {i < 3 && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -11,
                          width: 20,
                          height: 20,
                          marginLeft: -10,
                          borderRadius: "50%",
                          background: bg,
                          borderBottom: "1.5px solid #9D8BB5",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                  ...f(600, "13px", "1", BODY),
                }}
              >
                <span style={{ color: "#5E4E78", marginRight: 4 }}>Revise on</span>
                {["Day 1", "Day 3", "Day 7", "Day 21"].map((d) => (
                  <span
                    key={d}
                    style={{ padding: "6px 10px", borderRadius: 999, background: "#FFFFFF" }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
            {/* Hover and focus live on this still wrapper; only the inner card rotates,
                so the pointer never "leaves" the card mid-flip and makes it judder. */}
            <div
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label="Hadith card. Activate to flip between Arabic and English meaning."
              onMouseEnter={() => {
                if (window.matchMedia("(hover: hover)").matches) setFlipped(true)
              }}
              onMouseLeave={() => {
                if (window.matchMedia("(hover: hover)").matches) setFlipped(false)
              }}
              onClick={() => {
                if (!window.matchMedia("(hover: hover)").matches) toggleFlip()
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleFlip()
                }
              }}
              style={{
                perspective: 1200,
                minHeight: 340,
                height: "100%",
                cursor: "pointer",
                borderRadius: 28,
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  minHeight: 340,
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${flipped ? 180 : 0}deg)`,
                  transition: "transform .7s cubic-bezier(.34,1.3,.64,1)",
                  borderRadius: 28,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    opacity: flipped ? 0 : 1,
                    transition: "opacity 0s linear .3s",
                    borderRadius: 28,
                    padding: "clamp(20px,3vw,32px)",
                    background: mix("#C9A06B", 24),
                    border: `1.5px solid ${mix("#C9A06B", 55)}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <h3 style={{ margin: 0, ...f(700, "24px", "1.1", HEAD) }}>
                      Hadith of the week
                    </h3>
                    <span style={{ ...f(600, "14px", "1", BODY), color: "#7A5A2E" }}>Week 12</span>
                  </div>
                  <p
                    lang="ar"
                    dir="rtl"
                    style={{
                      margin: 0,
                      textAlign: "center",
                      ...ar(600, "clamp(30px,3.4vw,40px)", "2"),
                    }}
                  >
                    {HADITH_AR}
                  </p>
                  <span
                    style={{ alignSelf: "center", ...f(600, "14px", "1", BODY), color: "#7A5A2E" }}
                  >
                    Hover or tap to see the meaning ↻
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    opacity: flipped ? 1 : 0,
                    transition: "opacity 0s linear .3s",
                    borderRadius: 28,
                    padding: "clamp(20px,3vw,32px)",
                    background: "#FFFFFF",
                    border: `1.5px solid ${mix("#C9A06B", 55)}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 14,
                  }}
                >
                  <p
                    lang="ar"
                    dir="rtl"
                    style={{
                      margin: 0,
                      textAlign: "center",
                      ...ar(600, "24px", "2"),
                      color: "#7A5A2E",
                    }}
                  >
                    {HADITH_AR}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      textAlign: "center",
                      ...f(700, "clamp(22px,2.4vw,28px)", "1.25", HEAD),
                    }}
                  >
                    “Your smile for your brother is a charity.”
                  </p>
                  <p
                    style={
                      {
                        margin: 0,
                        textAlign: "center",
                        ...f(400, "16px", "1.6", BODY),
                        textWrap: "pretty",
                      } as CSSProperties
                    }
                  >
                    When you smile at someone, Allah counts it as a good deed, just like giving
                    something away.
                  </p>
                  <span
                    style={{ alignSelf: "center", ...f(600, "13px", "1", BODY), color: "#7A5A2E" }}
                  >
                    Jami&apos; at-Tirmidhi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Pray with me: one step at a time, with the teacher's Arabic ── */}
        <section
          id="ch6"
          data-chapter=""
          aria-labelledby="h-ch6"
          style={section({
            background: mix("#C98A8A", 18),
            border: `1.5px solid ${mix("#C98A8A", 45)}`,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(24px,4vw,36px)",
          })}
        >
          <div data-reveal="" style={{ ...col(), maxWidth: 640 }}>
            <span style={eyebrow("#864848")}>Chapter 6</span>
            <h2 id="h-ch6" style={h2()}>
              Pray with me
            </h2>
            <p style={para()}>
              Nine steps, always in order. Each one comes with a picture, the words your teacher
              checked, and the teacher&apos;s own voice to repeat after in class.
            </p>
          </div>
          <div data-reveal="" data-delay="150">
            <PraySteps slides={namaz} />
          </div>
        </section>

        {/* ── 7. Stars you earn ── */}
        <section
          id="ch7"
          data-chapter=""
          aria-labelledby="h-ch7"
          style={section({
            position: "relative",
            background: mix("#E3B04B", 22),
            border: `1.5px solid ${mix("#E3B04B", 55)}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))",
            gap: "clamp(32px,5vw,56px)",
            alignItems: "center",
          })}
        >
          <div data-reveal="" style={col()}>
            <span style={eyebrow("#7A5A12")}>Chapter 7 · Dusk</span>
            <h2 id="h-ch7" style={h2()}>
              Stars you earn
            </h2>
            <p style={para()}>
              Quizzes after every lesson. A streak that never breaks on your teacher&apos;s day off.
              Badges, trophies and real certificates you can print.
            </p>
          </div>
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 14,
            }}
          >
            <div
              data-trigger="confetti"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "30%",
                width: 1,
                height: 1,
                zIndex: 5,
              }}
            />
            <div
              style={{
                borderRadius: 24,
                padding: 18,
                background: "#FFFFFF",
                border: `1.5px solid ${mix("#E3B04B", 55)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg
                data-trigger="medal"
                viewBox="0 0 100 100"
                width="96"
                height="96"
                role="img"
                aria-label="Gold medal"
              >
                <path d="M30 0 L46 0 L56 38 L40 38 Z" fill="#D98363" />
                <path d="M70 0 L54 0 L44 38 L60 38 Z" fill="#6FA3A0" />
                <circle cx="50" cy="64" r="30" fill="#E3B04B" />
                <circle cx="50" cy="64" r="21" fill="none" stroke="#FFFFFF" strokeWidth="3" />
                <text
                  x="50"
                  y="74"
                  textAnchor="middle"
                  fontFamily={HEAD}
                  fontWeight="700"
                  fontSize="28"
                  fill="#2E3A2F"
                >
                  1
                </text>
              </svg>
              <span style={{ ...f(700, "16px", "1.2", HEAD), textAlign: "center" }}>
                Quiz champion
              </span>
            </div>
            <div
              data-trigger="streak"
              style={{
                borderRadius: 24,
                padding: 18,
                background: mix("#D98363", 24),
                border: `1.5px solid ${mix("#D98363", 55)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  display: "inline-block",
                  animation: "vvFlame 1.4s ease-in-out infinite",
                }}
              >
                🔥
              </span>
              <span data-num="" style={f(700, "46px", "1", HEAD)}>
                0
              </span>
              <span style={f(700, "14px", "1", BODY)}>day streak</span>
            </div>
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
              }}
            >
              {(
                [
                  ["📖", "Qaida complete", "#8FA97A", 200],
                  ["🌙", "First surah", "#9D8BB5", 320],
                  ["⭐", "10 quizzes", "#7FA3B8", 440],
                ] as const
              ).map(([e, t, c, d]) => (
                <div
                  key={t}
                  data-from="scale(.6)"
                  data-fade=""
                  data-delay={d}
                  style={{
                    borderRadius: 20,
                    padding: "12px 8px",
                    background: "#FFFFFF",
                    border: `1.5px solid ${mix(c, 50)}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    textAlign: "center",
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 28 }}>
                    {e}
                  </span>
                  <span style={f(700, "14px", "1.15", HEAD)}>{t}</span>
                </div>
              ))}
            </div>
            <div
              data-reveal=""
              data-delay="400"
              style={{
                gridColumn: "1 / -1",
                borderRadius: 24,
                padding: 8,
                background: "#FFFFFF",
                border: `1.5px solid ${mix("#E3B04B", 55)}`,
              }}
            >
              <div
                style={{
                  border: "2px dashed #E3B04B",
                  borderRadius: 18,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      ...f(700, "12px", "1", BODY),
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: "#7A5A12",
                    }}
                  >
                    Certificate
                  </span>
                  <span style={f(700, "20px", "1.15", HEAD)}>Norani Qaida, completed</span>
                  <span style={f(400, "14px", "1.3", BODY)}>
                    Awarded to Yusuf · Verse &amp; Voice
                  </span>
                </div>
                <Star size={46} inner />
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Stories from long ago ── */}
        <section
          id="ch8"
          data-chapter=""
          aria-labelledby="h-ch8"
          style={section({
            background: mix("#6FA3A0", 22),
            border: `1.5px solid ${mix("#6FA3A0", 50)}`,
            boxShadow: "0 8px 24px rgba(18,22,18,0.3)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(28px,4vw,40px)",
          })}
        >
          <div data-reveal="" style={{ ...col(), maxWidth: 640 }}>
            <span style={eyebrow("#2F5F5C")}>Chapter 8</span>
            <h2 id="h-ch8" style={h2()}>
              Stories from long ago
            </h2>
            <p style={para()}>
              Stories of the prophets and companions, one scene at a time, with a question at the
              end to talk about at dinner.
            </p>
          </div>
          <div
            style={{
              perspective: 1800,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
              gap: 0,
              filter: "drop-shadow(0 8px 24px rgba(46,58,47,0.14))",
            }}
          >
            <div
              style={{
                position: "relative",
                minHeight: 320,
                borderRadius: "24px 6px 6px 24px",
                background: mix("#6FA3A0", 35),
                display: "grid",
                placeItems: "center",
                overflow: "visible",
              }}
            >
              <div
                role="img"
                aria-label={sc.alt}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "clamp(70px,9vw,104px)",
                    lineHeight: 1,
                    animation: "vvFloat 5s ease-in-out infinite",
                  }}
                >
                  {sc.a}
                </span>
                <span
                  aria-hidden="true"
                  style={{ fontSize: "clamp(44px,5vw,60px)", lineHeight: 1 }}
                >
                  {sc.b}
                </span>
              </div>
              <span
                style={{
                  position: "absolute",
                  left: 18,
                  top: 16,
                  ...f(700, "14px", "1", HEAD),
                  color: "#2F5F5C",
                }}
              >
                Prophet Yunus and the whale
              </span>
              <div
                data-from="rotateY(0deg)"
                data-to="rotateY(-115deg)"
                data-endop="0"
                data-dur="1400"
                data-delay="200"
                data-ease="cubic-bezier(.5,0,.2,1)"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "24px 6px 6px 24px",
                  background: "#2F5F5C",
                  transformOrigin: "left center",
                  pointerEvents: "none",
                  display: "grid",
                  placeItems: "center",
                  backfaceVisibility: "hidden",
                }}
              >
                <span
                  style={{ ...f(700, "28px", "1.1", HEAD), color: "#F0ECDE", textAlign: "center" }}
                >
                  Stories
                  <br />
                  from long ago
                </span>
              </div>
            </div>
            <div
              style={{
                position: "relative",
                minHeight: 320,
                borderRadius: "6px 24px 24px 6px",
                background: "#FFFFFF",
                padding: "clamp(20px,3vw,32px)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <span
                style={{
                  ...f(700, "13px", "1", BODY),
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "#2F5F5C",
                }}
              >
                Scene {scene + 1} of 3
              </span>
              <p
                aria-live="polite"
                style={
                  { margin: 0, ...f(600, "19px", "1.6", BODY), textWrap: "pretty" } as CSSProperties
                }
              >
                {sc.t}
              </p>
              {scene === 2 && (
                <p
                  style={{
                    margin: 0,
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: mix("#6FA3A0", 20),
                    ...f(700, "16px", "1.4", HEAD),
                  }}
                >
                  Talk about it at dinner: when did you say sorry and start again?
                </p>
              )}
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    role="img"
                    aria-label={`Moral compass pointing to ${sc.v}`}
                    style={{
                      position: "relative",
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#F8F6EE",
                      border: "1.5px solid #6FA3A0",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 4,
                        marginLeft: -1,
                        width: 2,
                        height: 6,
                        background: "#6FA3A0",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 4,
                        height: 26,
                        margin: "-26px 0 0 -2px",
                        borderRadius: 2,
                        background: "#C96F4F",
                        transformOrigin: "50% 100%",
                        transform: `rotate(${sc.deg}deg)`,
                        transition: "transform .8s cubic-bezier(.34,1.56,.64,1)",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 10,
                        height: 10,
                        margin: "-5px 0 0 -5px",
                        borderRadius: "50%",
                        background: "#2E3A2F",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ ...f(600, "12px", "1", BODY), color: "#2F5F5C" }}>
                      Moral compass
                    </span>
                    <span style={f(700, "17px", "1", HEAD)}>{sc.v}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setScene((s) => Math.max(0, s - 1))}
                    disabled={scene === 0}
                    aria-label="Previous scene"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      border: "1.5px solid #D9C9B2",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      color: "#2E3A2F",
                      ...f(700, "20px", "1", HEAD),
                      opacity: scene === 0 ? 0.4 : 1,
                    }}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="lift"
                    onClick={() => setScene((s) => (s === 2 ? 0 : s + 1))}
                    style={{
                      height: 48,
                      padding: "0 18px",
                      borderRadius: 999,
                      border: 0,
                      background: "#2E3A2F",
                      color: "#F8F6EE",
                      cursor: "pointer",
                      ...f(700, "16px", "1", HEAD),
                    }}
                  >
                    {scene === 2 ? "Start again ↺" : "Next scene →"}
                  </button>
                </div>
              </div>
              <div
                data-from="rotateY(0deg)"
                data-to="rotateY(115deg)"
                data-endop="0"
                data-dur="1400"
                data-delay="200"
                data-ease="cubic-bezier(.5,0,.2,1)"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "6px 24px 24px 6px",
                  background: "#3A706C",
                  transformOrigin: "right center",
                  pointerEvents: "none",
                  display: "grid",
                  placeItems: "center",
                  backfaceVisibility: "hidden",
                }}
              >
                <Star size={54} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. For the grown-ups ── */}
        <section
          id="ch9"
          data-chapter=""
          aria-labelledby="h-ch9"
          style={section({
            background: mix("#D9C9B2", 55),
            border: "1.5px solid #D9C9B2",
            boxShadow: "0 8px 24px rgba(18,22,18,0.35)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
            gap: "clamp(32px,5vw,56px)",
            alignItems: "start",
          })}
        >
          <div style={col(22)}>
            <div data-reveal="" style={col()}>
              <span style={eyebrow("#6A5638")}>Chapter 9</span>
              <h2 id="h-ch9" style={h2()}>
                For the grown-ups
              </h2>
              <p style={para()}>
                See every class, every para, every quiz. A one-page report each month. Times in your
                own timezone.
              </p>
            </div>
            <div style={col(12)}>
              {QUOTES.map((q, i) => (
                <figure
                  key={q.who}
                  data-reveal=""
                  data-delay={100 * (i + 1)}
                  style={{
                    margin: 0,
                    borderRadius: 22,
                    padding: "16px 18px",
                    background: "#FFFFFF",
                    border: "1.5px solid #D9C9B2",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <blockquote style={{ margin: 0, ...f(600, "17px", "1.5", BODY) }}>
                    “{q.q}”
                  </blockquote>
                  <figcaption style={{ ...f(700, "15px", "1", HEAD), color: "#6A5638" }}>
                    {q.who}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div
            data-reveal=""
            data-delay="150"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <div
              role="img"
              aria-label="Parent app showing attendance, monthly report, fees paid and class time in two timezones"
              style={{
                width: "min(100%,330px)",
                background: "#FFFFFF",
                border: "7px solid #2E3A2F",
                borderRadius: 36,
                padding: "18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: SHADOW,
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={f(700, "18px", "1", HEAD)}>Yusuf&apos;s month</span>
                <span style={{ ...f(600, "12px", "1", BODY), color: "#6B7F5B" }}>September</span>
              </div>
              <div style={{ borderRadius: 18, background: "#F8F6EE", padding: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7,1fr)",
                    gap: 4,
                    textAlign: "center",
                    ...f(700, "10px", "1", BODY),
                    color: "#6B7F5B",
                    marginBottom: 6,
                  }}
                >
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                  {CAL.map((cd, i) => (
                    <div
                      key={i}
                      style={{
                        height: 30,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        ...f(600, "11px", "1", BODY),
                        color: "#2E3A2F",
                      }}
                    >
                      <span>{cd.d}</span>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: cd.dot,
                          boxShadow: `inset 0 0 0 1.5px ${cd.ring}`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 18,
                  border: "1.5px solid #E7DCCB",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={f(700, "15px", "1", HEAD)}>Monthly report</span>
                  <span style={{ ...f(600, "11px", "1", BODY), color: "#6B7F5B" }}>1 page</span>
                </div>
                {[
                  ["Classes attended", "13 of 14"],
                  ["Now reading", "Para 4"],
                  ["Quiz average", "92%"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      ...f(600, "13px", "1.2", BODY),
                    }}
                  >
                    <span>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
                <div
                  style={{ height: 6, borderRadius: 3, background: "#EFE7D9", overflow: "hidden" }}
                >
                  <div style={{ width: "72%", height: "100%", background: "#8FA97A" }} />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: mix("#8FA97A", 20),
                  ...f(700, "14px", "1", BODY),
                }}
              >
                <span>Fees: paid ✔</span>
                <span style={{ fontWeight: 600, color: "#4F6343" }}>Sept</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: mix("#7FA3B8", 18),
                }}
              >
                <span style={{ ...f(600, "11px", "1", BODY), color: "#3F6478" }}>Next class</span>
                <span style={f(700, "15px", "1.2", HEAD)}>4:30 PM London · 8:30 PM Karachi</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. Night ── */}
        <section
          id="ch10"
          data-chapter=""
          aria-labelledby="h-ch10"
          style={{
            scrollMarginTop: 96,
            maxWidth: 1180,
            width: "100%",
            margin: "0 auto",
            padding: "clamp(24px,6vw,72px) 0 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(48px,7vw,88px)",
            color: "#F0ECDE",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 28,
              width: "100%",
            }}
          >
            <div
              data-reveal=""
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
              }}
            >
              <span style={eyebrow("#E3B04B")}>Chapter 10 · Night</span>
              <h2
                id="h-ch10"
                style={
                  {
                    margin: 0,
                    ...f(700, "clamp(40px,5.6vw,68px)", "1.05", HEAD),
                    color: "#F0ECDE",
                    textWrap: "balance",
                  } as CSSProperties
                }
              >
                Your story begins tonight
              </h2>
            </div>
            <div
              data-reveal=""
              data-delay="150"
              style={{
                width: "min(100%,640px)",
                boxSizing: "border-box",
                background: "#1A1F1A",
                border: "1.5px solid #2C362C",
                borderRadius: 32,
                padding: "clamp(22px,4vw,40px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              <p
                style={{
                  margin: "0 0 18px",
                  textAlign: "center",
                  ...f(600, "17px", "1.5", BODY),
                  color: "rgba(240,236,222,0.85)",
                }}
              >
                Say salaam on any of these and we&apos;ll set up a free trial class in your own
                time.
              </p>
              <ContactCards />
            </div>
          </div>
          <footer
            style={{
              width: "100%",
              borderTop: "1px solid #2C362C",
              padding: "32px 0 40px",
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={40} id="lgC" label="Verse & Voice logo" />
              <span style={{ ...f(600, "15px", "1.4", BODY), color: "#F0ECDE" }}>
                Verse &amp; Voice · A friendly Quran learning space for kids
              </span>
            </div>
            <nav
              aria-label="Footer"
              style={{ display: "flex", gap: 22, flexWrap: "wrap", marginLeft: "auto" }}
            >
              <Link href="/login" className="gold" style={footLink}>
                Student login
              </Link>
              <a href="#" className="gold" style={footLink}>
                Privacy
              </a>
              <a href="#" className="gold" style={footLink}>
                Contact
              </a>
            </nav>
          </footer>
        </section>
      </main>
    </div>
  )
}
