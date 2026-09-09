/**
 * Browser device and hardware detection for student portal and live classes.
 * Accurately detects iPads, tablets, laptops, desktops, and mobile devices
 * based on userAgent, touch capabilities, screen resolutions, and pixel ratios.
 */

export interface DeviceInfo {
  label: string
  type: "tablet" | "laptop" | "mobile" | "desktop"
  screen: {
    width: number
    height: number
    pixelRatio: number
  }
  isTouch: boolean
}

export function detectDevice(
  nav?: { userAgent?: string; maxTouchPoints?: number; platform?: string },
  scr?: { width?: number; height?: number; devicePixelRatio?: number },
): DeviceInfo {
  if (typeof window === "undefined" && !nav) {
    return {
      label: "Unknown Device",
      type: "desktop",
      screen: { width: 0, height: 0, pixelRatio: 1 },
      isTouch: false,
    }
  }

  const ua = nav?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  const touchPoints = nav?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0)
  const isTouch = touchPoints > 0
  const width = scr?.width ?? (typeof window !== "undefined" ? window.screen.width : 0)
  const height = scr?.height ?? (typeof window !== "undefined" ? window.screen.height : 0)
  const pixelRatio = scr?.devicePixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)

  const minDim = Math.min(width, height)
  const maxDim = Math.max(width, height)

  // 1. iPhone / iPod Detection
  if (ua.includes("iPhone") || ua.includes("iPod")) {
    return {
      label: "Apple iPhone",
      type: "mobile",
      screen: { width, height, pixelRatio },
      isTouch: true,
    }
  }

  // 2. iPad Detection (iPadOS 13+ reports as Macintosh in UA, but has touchPoints > 1)
  const isIpadOS = ua.includes("Macintosh") && touchPoints > 1
  const isIpadUA = ua.includes("iPad")

  if (isIpadOS || isIpadUA) {
    let ipadModel = "iPad"
    // Check known iPad logical screen dimensions
    if (minDim === 1024 && maxDim === 1366) {
      ipadModel = 'iPad Pro (12.9")'
    } else if (minDim === 834 && maxDim === 1194) {
      ipadModel = 'iPad Pro (11")'
    } else if (minDim === 820 && maxDim === 1180) {
      ipadModel = 'iPad (10.9")'
    } else if (minDim === 834 && maxDim === 1112) {
      ipadModel = 'iPad Air / Pro (10.5")'
    } else if (minDim === 810 && maxDim === 1080) {
      ipadModel = 'iPad (10.2")'
    } else if (minDim === 768 && maxDim === 1024) {
      ipadModel = 'iPad (9.7" / Mini)'
    } else if (minDim === 744 && maxDim === 1133) {
      ipadModel = 'iPad mini (8.3")'
    } else {
      ipadModel = "Apple iPad"
    }

    return {
      label: ipadModel,
      type: "tablet",
      screen: { width, height, pixelRatio },
      isTouch: true,
    }
  }

  // 3. Android Detection (Tablet vs Phone based on screen size)
  if (ua.includes("Android")) {
    const isTablet = minDim >= 600 || !ua.includes("Mobile")
    return {
      label: isTablet ? "Android Tablet" : "Android Phone",
      type: isTablet ? "tablet" : "mobile",
      screen: { width, height, pixelRatio },
      isTouch: true,
    }
  }

  // 4. Mac Desktop / Laptop (Non-touch Macintosh)
  if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
    const isRetina = pixelRatio >= 2
    return {
      label: isRetina ? "MacBook (Retina)" : "Mac",
      type: "laptop",
      screen: { width, height, pixelRatio },
      isTouch: false,
    }
  }

  // 5. Windows PC / Laptop
  if (ua.includes("Windows")) {
    const label = isTouch ? "Windows Laptop (Touch)" : "Windows PC"
    return {
      label,
      type: isTouch ? "laptop" : "desktop",
      screen: { width, height, pixelRatio },
      isTouch,
    }
  }

  // 6. Generic Fallback by dimension
  if (minDim < 600 && isTouch) {
    return {
      label: "Mobile Device",
      type: "mobile",
      screen: { width, height, pixelRatio },
      isTouch: true,
    }
  }

  if (minDim >= 600 && minDim <= 900 && isTouch) {
    return {
      label: "Tablet",
      type: "tablet",
      screen: { width, height, pixelRatio },
      isTouch: true,
    }
  }

  return {
    label: "Computer / Laptop",
    type: "desktop",
    screen: { width, height, pixelRatio },
    isTouch,
  }
}
