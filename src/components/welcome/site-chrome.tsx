import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

import { BODY, f, HEAD, SHADOW } from "@/components/welcome/welcome-styles"
import { cn } from "@/lib/utils"

/**
 * The website's header and footer, shared by the landing page (/) and the text
 * pages (/faq, /privacy, /terms) so every public page wears the same chrome.
 * Ported from the approved mock with the landing page; styles stay inline.
 * Needs a `.vvw` ancestor and CHROME_CSS on the page.
 */

/** Hover, focus, breakpoint and animation rules the chrome relies on. */
export const CHROME_CSS = `
.vvw a{color:#C96F4F}.vvw a:hover{color:#2E3A2F}
.vvw :focus-visible{outline:3px solid #D98363;outline-offset:3px;border-radius:12px}
.vvw .lift{transition:transform .2s}.vvw .lift:hover{transform:translateY(-2px)}.vvw .lift:active{transform:scale(.99)}
.vvw .gold:hover{color:#E3B04B!important}
.vvw .lbl-short{display:none}
.vvw .kids{height:58px;padding:0 20px}
@media (max-width:1119px){.vvw .lbl-long{display:none}.vvw .lbl-short{display:inline}}
@media (max-width:760px){.vvw .foot{justify-content:center;text-align:center}.vvw .foot nav{margin-left:0!important;width:100%;justify-content:center}.vvw .foot > div:first-child{justify-content:center}.vvw .kids{height:46px;padding:0 16px}.vvw .kids .lbl-long{display:inline}.vvw .kids .lbl-short{display:none}.vvw .topbar .cta{height:46px!important}.vvw .topbar .cta .pad{width:36px!important;height:36px!important}}
@media (max-width:480px){.vvw .wordmark{display:none}.vvw .topbar > div{padding-left:12px!important;padding-right:12px!important;gap:10px!important}}
@keyframes vvBar{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
@keyframes vvTwinkle{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes vvShine{0%{transform:translateX(-160%) skewX(-20deg)}55%,100%{transform:translateX(380%) skewX(-20deg)}}
@media (prefers-reduced-motion: reduce){.vvw *,.vvw *::before,.vvw *::after{animation:none!important;transition:none!important}}
`

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
export function Logo({
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
export function SunrisePill({
  href,
  label,
  h = 58,
  pad = 46,
  size = "19px",
  delay,
  submit,
  shadow = SHADOW,
  className,
}: {
  href?: string
  label: ReactNode
  h?: number
  pad?: number
  size?: string
  delay?: string
  submit?: boolean
  shadow?: string
  className?: string
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
        className="pad"
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
    <button type="submit" className={cn("lift", className)} style={style}>
      {inner}
    </button>
  ) : (
    <a href={href} className={cn("lift", className)} style={style}>
      {inner}
    </a>
  )
}

/** Sticky top bar: logo, an optional middle slot (the landing's age toggle), Kids login, free trial. */
export function SiteHeader({
  home,
  trial,
  middle,
  children,
}: {
  /** Where the logo goes: "#ch1" on the landing page, "/" elsewhere. */
  home: string
  /** Where "Book a free trial" goes: "#ch10" on the landing page, "/#ch10" elsewhere. */
  trial: string
  middle?: ReactNode
  /** Rendered under the bar (the landing's scroll progress line). */
  children?: ReactNode
}) {
  return (
    <header
      className="topbar"
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
          flexWrap: "nowrap",
        }}
      >
        <a
          href={home}
          aria-label={home.startsWith("#") ? "Verse & Voice, back to top" : "Verse & Voice home"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--ink,#2E3A2F)",
          }}
        >
          <Logo size={44} id="lgA" label="Verse & Voice logo: an open book with voice waves" />
          <span className="wordmark" style={{ ...f(700, "23px", "1", HEAD), whiteSpace: "nowrap" }}>
            Verse{" "}
            <span style={{ fontWeight: 600, fontStyle: "italic", color: "#C96F4F" }}>&amp;</span>{" "}
            Voice
          </span>
        </a>
        {middle}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Kids login: the student portal's own door, right in the top bar */}
          <Link
            href="/login"
            className="lift kids"
            aria-label="Kids login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
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
            <span className="kids-label">
              <span className="lbl-long">Kids login</span>
              <span className="lbl-short">Login</span>
            </span>
          </Link>
          <SunrisePill
            href={trial}
            className="cta"
            label={
              <>
                <span className="lbl-long">Book a free trial</span>
                <span className="lbl-short">Free trial</span>
              </>
            }
            size="17px"
          />
        </div>
      </div>
      {children}
    </header>
  )
}

const footLink: CSSProperties = {
  ...f(600, "15px", "1", BODY),
  color: "#F0ECDE",
  textDecoration: "none",
}

/** Night-coloured footer row: logo, tagline and the links to every public page. */
export function SiteFooter({ contact }: { contact: string }) {
  return (
    <footer
      className="foot"
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
        <a href="/faq" className="gold" style={footLink}>
          FAQ
        </a>
        <a href="/privacy" className="gold" style={footLink}>
          Privacy
        </a>
        <a href="/terms" className="gold" style={footLink}>
          Terms
        </a>
        <a href={contact} className="gold" style={footLink}>
          Contact
        </a>
      </nav>
    </footer>
  )
}
