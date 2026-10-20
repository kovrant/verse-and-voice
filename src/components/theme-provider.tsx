"use client"

import { usePathname, useSelectedLayoutSegment } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

// Portal-scoped theming. The active portal is stamped on <html data-portal>,
// which selects the palette block in globals.css. Both portals support a
// light/dark toggle, sharing a single preference.

/** Public website pages beside /welcome (src/app/(site)); keep in sync with the layout's first-paint script. */
export const SITE_PAGES = ["/faq", "/privacy", "/terms"]

export type Portal = "admin" | "student"

const DARK_KEY = "qa-dark"

function portalForPath(pathname: string): Portal {
  if (
    pathname === "/login" ||
    pathname === "/welcome" ||
    SITE_PAGES.includes(pathname) ||
    pathname === "/student" ||
    pathname.startsWith("/student/")
  ) {
    return "student"
  }
  return "admin"
}

interface ThemeContextValue {
  portal: Portal
  dark: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  portal: "admin",
  dark: false,
  toggleDark: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  // The public website is served at "/" by a middleware rewrite of /welcome, so
  // the pathname lies there; the rendered route segment does not.
  const segment = useSelectedLayoutSegment()
  const portal = segment === "welcome" || segment === "(site)" ? "student" : portalForPath(pathname)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    try {
      setDark(localStorage.getItem(DARK_KEY) === "true")
    } catch {}
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.portal = portal
    root.classList.toggle("dark", dark)
  }, [portal, dark])

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d
      try {
        localStorage.setItem(DARK_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ portal, dark, toggleDark }}>{children}</ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
