import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// Verse & Voice: a bold "V" (verse) over a small equalizer (voice).
export default function AppleIcon() {
  const bar = (h: number, o: number) => ({
    width: 13,
    height: h,
    borderRadius: 7,
    background: `rgba(255,255,255,${o})`,
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(140deg, #F6A94C, #F26B4E 55%, #7CB8E8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            color: "white",
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          V
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 24 }}>
          <div style={bar(11, 0.7)} />
          <div style={bar(24, 0.95)} />
          <div style={bar(15, 0.8)} />
          <div style={bar(21, 0.9)} />
        </div>
      </div>
    ),
    { ...size }
  )
}
