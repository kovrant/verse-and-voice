"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

/**
 * Compact light/dark switch for top bars. A sliding knob (bg-card) over a
 * muted track — kept legible in both palettes by never relying on --primary
 * for the knob fill (which flips to near-white in the graphite dark theme).
 */
export function ThemeSwitch() {
  const { dark, toggleDark } = useTheme()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleDark}
      className="relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border border-border bg-muted/60 px-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {/* Track icons */}
      <Sun
        className={cn(
          "absolute left-[7px] h-3.5 w-3.5 transition-opacity",
          dark ? "opacity-40 text-muted-foreground" : "opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute right-[7px] h-3.5 w-3.5 transition-opacity",
          dark ? "opacity-0" : "opacity-40 text-muted-foreground",
        )}
      />

      {/* Sliding knob */}
      <span
        className={cn(
          "relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition-transform duration-200",
          dark ? "translate-x-6" : "translate-x-0",
        )}
      >
        {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  )
}
