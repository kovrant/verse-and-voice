"use client"

import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { themes, themeKeys, type ThemeKey } from "@/lib/themes"
import { Palette, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-4 mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
          open
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
        )}
      >
        <Palette className="h-[18px] w-[18px]" />
        <span>Appearance</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 animate-fade-in-up">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2.5 px-0.5">
            Color Theme
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themeKeys.map((key) => {
              const t = themes[key]
              const isActive = theme === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all",
                    isActive
                      ? "bg-white/[0.06] ring-1 ring-emerald-500/40"
                      : "hover:bg-white/[0.04]"
                  )}
                >
                  {/* Color swatch */}
                  <div className="relative w-full h-6 rounded-md overflow-hidden flex">
                    <div
                      className="flex-1"
                      style={{ background: `hsl(${t.preview[0]})` }}
                    />
                    <div
                      className="flex-1"
                      style={{ background: `hsl(${t.preview[1]})` }}
                    />
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <span className={cn(
                    "text-[9px] font-medium leading-tight text-center",
                    isActive ? "text-foreground" : "text-muted-foreground/60"
                  )}>
                    {t.name.split(" & ")[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
