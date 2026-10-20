import { ImageResponse } from "next/og"

import { SITE } from "@/lib/site"

export const alt = `${SITE.name} · ${SITE.title}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** The link-preview card WhatsApp, Facebook and search results show for every public page. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(160deg, #FEF7EC 0%, #F8F1DF 60%, #ECDDC4 100%)",
        color: "#2E3A2F",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            background: "linear-gradient(140deg, #F6A94C, #F26B4E 55%, #7CB8E8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 52,
            fontWeight: 800,
          }}
        >
          V
        </div>
        <div style={{ fontSize: 44, fontWeight: 800 }}>Verse &amp; Voice</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }}>
          Online Quran classes for kids &amp; teens
        </div>
        <div style={{ fontSize: 34, color: "#55634F" }}>
          One-to-one, by voice · Qaida · Tajweed · Hifz · Namaz
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 28 }}>
        <div
          style={{ background: "#6B7F5B", color: "white", padding: "12px 28px", borderRadius: 999 }}
        >
          Free trial class
        </div>
        <div style={{ padding: "12px 4px", color: "#55634F" }}>USA · Canada · Gulf · worldwide</div>
      </div>
    </div>,
    { ...size },
  )
}
