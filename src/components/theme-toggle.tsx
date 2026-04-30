"use client"

import { useTheme } from "@/components/theme-provider"
import { themes, themeKeys } from "@/lib/themes"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-4 mb-3">
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
        {themeKeys.map((key) => {
          const t = themes[key]
          const isActive = theme === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              title={t.description}
              className={cn(
                "flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
                isActive
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className="inline-flex h-3.5 w-3.5 rounded-full ring-1 ring-black/5 overflow-hidden flex-shrink-0"
                aria-hidden
              >
                <span
                  className="block w-1/2 h-full"
                  style={{ background: `hsl(${t.preview[0]})` }}
                />
                <span
                  className="block w-1/2 h-full"
                  style={{ background: `hsl(${t.preview[1]})` }}
                />
              </span>
              <span className="truncate">{t.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
