"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import { usePathname } from "next/navigation"

// Portal-scoped theming. The active portal is stamped on <html data-portal>,
// which selects the palette block in globals.css. Both portals support a
// light/dark toggle, sharing a single preference.

export type Portal = "admin" | "student"

const DARK_KEY = "qa-dark"

export function portalForPath(pathname: string): Portal {
  if (
    pathname === "/login" ||
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
  const portal = portalForPath(pathname)
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
    <ThemeContext.Provider value={{ portal, dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
