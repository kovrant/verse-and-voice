"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"

/** NextAdmin's square header button; the teacher bell and send triggers share it. */
export const headerIconButton =
  "relative flex size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs transition-colors hover:bg-background-gray-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 data-[state=open]:bg-background-gray-primary"

/** Light/dark toggle for the teacher top bar: shows the mode you'd switch to. */
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
      className={headerIconButton}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
