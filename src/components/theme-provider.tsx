"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { themes, type ThemeKey } from "@/lib/themes"

const STORAGE_KEY = "quran-academy-theme"

interface ThemeContextValue {
  theme: ThemeKey
  setTheme: (theme: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "emerald",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>("emerald")
  const [mounted, setMounted] = useState(false)

  const applyTheme = useCallback((key: ThemeKey) => {
    const themeColors = themes[key]?.colors
    if (!themeColors) return
    const root = document.documentElement
    for (const [prop, value] of Object.entries(themeColors)) {
      root.style.setProperty(prop, value)
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null
    if (saved && themes[saved]) {
      setThemeState(saved)
      applyTheme(saved)
    }
    setMounted(true)
  }, [applyTheme])

  function setTheme(key: ThemeKey) {
    setThemeState(key)
    localStorage.setItem(STORAGE_KEY, key)
    applyTheme(key)
  }

  // Prevent flash of default theme before hydration
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
