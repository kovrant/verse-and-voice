import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "linear-gradient(135deg, #10b981, #0d9488)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ fontSize: 72, color: "white", fontFamily: "serif", lineHeight: 1 }}>Q</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", letterSpacing: 3, textTransform: "uppercase" as const }}>Academy</div>
      </div>
    ),
    { ...size }
  )
}
