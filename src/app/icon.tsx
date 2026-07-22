import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "linear-gradient(140deg, #F6A94C, #F26B4E 55%, #7CB8E8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 20,
        fontWeight: 800,
        fontFamily: "sans-serif",
      }}
    >
      V
    </div>,
    { ...size },
  )
}
