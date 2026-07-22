"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// Segmented Light/Dark control for the admin portal. A segmented control (rather
// than a switch) stays legible in both palettes — the graphite dark palette flips
// --primary to near-white, which made a filled-track switch knob disappear.
export function ThemeToggle() {
  const { dark, toggleDark } = useTheme()

  const seg =
    "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"

  return (
    <div className="mx-4 mb-3">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => dark && toggleDark()}
          aria-pressed={!dark}
          className={cn(
            seg,
            !dark
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sun className="h-3.5 w-3.5" />
          Light
        </button>
        <button
          type="button"
          onClick={() => !dark && toggleDark()}
          aria-pressed={dark}
          className={cn(
            seg,
            dark
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Moon className="h-3.5 w-3.5" />
          Dark
        </button>
      </div>
    </div>
  )
}
