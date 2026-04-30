"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { themes, DEFAULT_THEME, type ThemeKey } from "@/lib/themes"

const STORAGE_KEY = "quran-academy-theme"

interface ThemeContextValue {
  theme: ThemeKey
  setTheme: (theme: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  const applyTheme = useCallback((key: ThemeKey) => {
    const config = themes[key]
    if (!config) return
    const root = document.documentElement
    for (const [prop, value] of Object.entries(config.colors)) {
      root.style.setProperty(prop, value)
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null
    const initial = saved && themes[saved] ? saved : DEFAULT_THEME
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [applyTheme])

  function setTheme(key: ThemeKey) {
    setThemeState(key)
    localStorage.setItem(STORAGE_KEY, key)
    applyTheme(key)
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
