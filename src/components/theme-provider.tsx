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
// which selects the palette block in globals.css. Admin supports a light/dark
// toggle; the student portal is light-first (dark is ignored there).

export type Portal = "admin" | "student"

const DARK_KEY = "qa-admin-dark"

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
    // Student portal is light-first — never apply dark there.
    root.classList.toggle("dark", portal === "admin" && dark)
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
    <ThemeContext.Provider
      value={{ portal, dark: portal === "admin" && dark, toggleDark }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
