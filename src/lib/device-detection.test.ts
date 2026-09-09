import { describe, expect, it } from "vitest"
import { detectDevice } from "./device-detection"

describe("detectDevice", () => {
  it("detects iPad with iPadOS 13+ (Macintosh UA with touchPoints)", () => {
    const info = detectDevice(
      {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
      },
      { width: 820, height: 1180, devicePixelRatio: 2 },
    )
    expect(info.type).toBe("tablet")
    expect(info.label).toBe('iPad (10.9")')
    expect(info.isTouch).toBe(true)
  })

  it("detects iPad Pro 12.9-inch", () => {
    const info = detectDevice(
      {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5,
      },
      { width: 1024, height: 1366, devicePixelRatio: 2 },
    )
    expect(info.type).toBe("tablet")
    expect(info.label).toBe('iPad Pro (12.9")')
  })

  it("detects MacBook (Non-touch Mac)", () => {
    const info = detectDevice(
      {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 0,
      },
      { width: 1440, height: 900, devicePixelRatio: 2 },
    )
    expect(info.type).toBe("laptop")
    expect(info.label).toBe("MacBook (Retina)")
    expect(info.isTouch).toBe(false)
  })

  it("detects Windows PC", () => {
    const info = detectDevice(
      {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        maxTouchPoints: 0,
      },
      { width: 1920, height: 1080, devicePixelRatio: 1 },
    )
    expect(info.type).toBe("desktop")
    expect(info.label).toBe("Windows PC")
  })

  it("detects iPhone", () => {
    const info = detectDevice(
      {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
        maxTouchPoints: 5,
      },
      { width: 390, height: 844, devicePixelRatio: 3 },
    )
    expect(info.type).toBe("mobile")
    expect(info.label).toBe("Apple iPhone")
  })
})
