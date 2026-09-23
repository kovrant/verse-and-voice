"use client"

import { Check, ChevronDown, ChevronUp, Search, Sparkles, X } from "lucide-react"
import React, { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  searchRules,
  TAJWEED_CATEGORIES,
  type TajweedCategory,
  type TajweedRule,
} from "@/lib/tajweed/rules"
import { cn } from "@/lib/utils"

interface TeacherTajweedPanelProps {
  onSendRule: (rule: TajweedRule) => void
  disabled?: boolean
  className?: string
  sessionRulesCount?: number
  sessionFooter?: React.ReactNode
}

export function TeacherTajweedPanel({
  onSendRule,
  disabled,
  className,
  sessionRulesCount = 0,
  sessionFooter,
}: TeacherTajweedPanelProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<TajweedCategory | "all">("all")
  const [justSentId, setJustSentId] = useState<string | null>(null)
  const [footerOpen, setFooterOpen] = useState(false)

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
    <aside
      aria-label="Teacher Tajweed Rules Deck"
      className={cn(
        "flex w-80 sm:w-84 flex-shrink-0 flex-col border-r border-border bg-card overflow-hidden h-full",
        className,
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-heading text-sm font-bold text-foreground leading-none">
              Tajweed Rules
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tap card to pop up on student screen
            </p>
          </div>
        </div>

        {sessionRulesCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span>{sessionRulesCount} sent</span>
          </span>
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
            placeholder="Search rule (zabar, qalqalah, noon...)"
            className="h-8.5 pl-8 pr-7 text-xs rounded-xl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category horizontal scroll tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold transition-colors shrink-0",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
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
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-colors shrink-0",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Rules Card Deck (Vertical Stack matching sketch) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
        {filteredRules.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No rules found matching &quot;{search}&quot;.
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isSent = justSentId === rule.id
            return (
              <button
                key={rule.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSend(rule)}
                className={cn(
                  "group relative w-full text-left rounded-[16px] border-2 transition-all duration-150 p-3.5 flex flex-col justify-between",
                  "shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
                  "disabled:pointer-events-none disabled:opacity-50",
                  isSent
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30"
                    : "border-border/80 bg-card hover:border-primary/60 text-foreground",
                )}
              >
                {/* Card Top: Arabic Symbol Badge + Tap to send indicator */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="flex h-10 min-w-[42px] max-w-[140px] px-3 items-center justify-center rounded-[12px] border font-arabic text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis shadow-xs"
                    style={{
                      background: `hsl(var(--kid-${rule.color}) / 0.25)`,
                      borderColor: `hsl(var(--kid-${rule.color}) / 0.6)`,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {rule.arabicSymbol}
                  </span>

                  {isSent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Sent ✓</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      Tap to send
                    </span>
                  )}
                </div>

                {/* Card Bottom: Urdu Name + English Title + Short Cue */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-arabic text-[17px] font-bold leading-tight text-foreground">
                      {rule.nameUrdu}
                    </span>
                    <span className="font-heading text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {rule.title}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground truncate">
                    💡 {rule.shortCue}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Optional Collapsible Session Details Footer */}
      {sessionFooter && (
        <div className="border-t border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={() => setFooterOpen(!footerOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Session Details & Progress</span>
            {footerOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          {footerOpen && (
            <div className="p-3 border-t border-border/60 max-h-48 overflow-y-auto text-xs space-y-2 bg-card">
              {sessionFooter}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
