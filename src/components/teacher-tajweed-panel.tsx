"use client"

import { Check, Search, Sparkles, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  getQuickPickRules,
  searchRules,
  TAJWEED_CATEGORIES,
  type TajweedCategory,
  type TajweedRule,
} from "@/lib/tajweed/rules"
import { cn } from "@/lib/utils"

interface TeacherTajweedPanelProps {
  onSendRule: (rule: TajweedRule) => void
  onClose?: () => void
  disabled?: boolean
  className?: string
}

export function TeacherTajweedPanel({
  onSendRule,
  onClose,
  disabled,
  className,
}: TeacherTajweedPanelProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<TajweedCategory | "all">("all")
  const [justSentId, setJustSentId] = useState<string | null>(null)

  const quickPicks = useMemo(() => getQuickPickRules(), [])

  const filteredRules = useMemo(() => {
    let list = searchRules(search)
    if (selectedCategory !== "all") {
      list = list.filter((r) => r.category === selectedCategory)
    }
    return list
  }, [search, selectedCategory])

  const handleSend = (rule: TajweedRule) => {
    onSendRule(rule)
    setJustSentId(rule.id)
    setTimeout(() => {
      setJustSentId((prev) => (prev === rule.id ? null : prev))
    }, 1800)
  }

  return (
    <div
      className={cn(
        "flex w-80 flex-shrink-0 flex-col border-r border-border bg-card overflow-hidden",
        className,
      )}
    >
      {/* Top Header with title and close button */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-heading text-[15px] font-bold text-foreground">
            Tajweed Rules
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tajweed panel"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sticky Search & Category Filter */}
      <div className="border-b border-border/70 p-3 space-y-2 bg-card">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rule (zaber, qalqala...)"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category horizontal scroll tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold transition-colors shrink-0",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            All ({filteredRules.length})
          </button>
          {TAJWEED_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors shrink-0",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Rules List (Top-to-Bottom / Upside-down) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* If no search and on 'all', show quick picks section at the top */}
        {!search && selectedCategory === "all" && (
          <div className="mb-2">
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              ⚡ Common Mistakes (Quick Pick)
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {quickPicks.map((rule) => {
                const isSent = justSentId === rule.id
                return (
                  <button
                    key={`qp-${rule.id}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSend(rule)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-all",
                      "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                      isSent
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border-border/80 bg-secondary/40 text-foreground hover:border-primary/50 hover:bg-secondary",
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-arabic text-sm font-bold text-primary shrink-0">
                        {rule.arabicSymbol}
                      </span>
                      <span className="truncate text-[11px] font-bold">{rule.nameUrdu}</span>
                    </div>
                    {isSent ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-600 animate-fade-in" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                        {rule.title.split(" ")[0]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="my-2 h-px bg-border/60" />
          </div>
        )}

        {/* Filtered Rules */}
        {filteredRules.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No rules found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="space-y-1">
            {!search && selectedCategory === "all" && (
              <div className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                All Rules ({filteredRules.length})
              </div>
            )}
            {filteredRules.map((rule) => {
              const isSent = justSentId === rule.id
              return (
                <button
                  key={rule.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSend(rule)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-all",
                    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
                    isSent
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "border-border/60 bg-card hover:border-primary/40 hover:bg-secondary/50",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Compact Symbol Badge */}
                    <span className="flex h-7 min-w-[28px] max-w-[80px] px-1 shrink-0 items-center justify-center rounded-md bg-secondary/80 font-arabic text-sm font-bold text-primary truncate">
                      {rule.arabicSymbol}
                    </span>

                    {/* Small Names */}
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-foreground truncate">
                          {rule.title}
                        </span>
                        <span className="font-arabic text-xs font-bold text-primary shrink-0">
                          {rule.nameUrdu}
                        </span>
                      </div>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {rule.shortCue}
                      </span>
                    </div>
                  </div>

                  {/* Sent Check or Tap Hint */}
                  <div className="shrink-0 ml-1">
                    {isSent ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                        <Check className="h-3 w-3" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        Send
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
