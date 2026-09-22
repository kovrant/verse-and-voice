"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { BookOpen, Check, Search, Sparkles, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getQuickPickRules,
  searchRules,
  TAJWEED_CATEGORIES,
  type TajweedCategory,
  type TajweedRule,
} from "@/lib/tajweed/rules"
import { cn } from "@/lib/utils"

interface TeacherTajweedTrayProps {
  onSendRule: (rule: TajweedRule) => void
  disabled?: boolean
  className?: string
}

export function TeacherTajweedTray({ onSendRule, disabled, className }: TeacherTajweedTrayProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<TajweedCategory | "all">("all")
  const [justSent, setJustSent] = useState<string | null>(null)

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
    setJustSent(rule.title)
    setTimeout(() => {
      setJustSent((prev) => (prev === rule.title ? null : prev))
    }, 2200)
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Quick Picks row */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {quickPicks.map((rule) => {
          const isSent = justSent === rule.title
          return (
            <button
              key={rule.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSend(rule)}
              title={`${rule.title} — ${rule.shortCue}`}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all",
                "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                isSent
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                  : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-secondary/60",
              )}
            >
              <span className="font-arabic text-sm leading-none">{rule.arabicSymbol}</span>
              <span className="font-medium">{rule.nameUrdu}</span>
              {isSent && <Check className="h-3 w-3 animate-fade-in text-emerald-600" />}
            </button>
          )
        })}
      </div>

      {/* Full Catalog Button */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 gap-1.5 rounded-full border-dashed px-3 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Rules Library (25+)</span>
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="font-heading text-lg font-bold text-foreground">
                  Tajweed & Recitation Rule Cards
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  Click any rule to immediately pop up an interactive reminder on the student&apos;s screen.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Search & Category Filter */}
            <div className="border-b border-border/60 bg-muted/30 px-5 py-3 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by rule name (e.g. Zabar, Qalqalah, Ikhfa, Noon, Thaa)..."
                  className="h-9 pl-9 pr-4 text-sm"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-semibold transition-colors",
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
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-colors",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Cards Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {filteredRules.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No rules found matching &quot;{search}&quot;. Try searching for another term.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredRules.map((rule) => {
                    const isSent = justSent === rule.title
                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex flex-col justify-between rounded-xl border p-3.5 transition-all",
                          isSent
                            ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:shadow-soft",
                        )}
                      >
                        <div>
                          {/* Title & Badge */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-heading text-base font-bold text-foreground">
                                  {rule.title}
                                </span>
                                <span className="font-arabic text-sm text-primary font-bold">
                                  {rule.nameUrdu}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {rule.nameArabic}
                              </span>
                            </div>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/80 font-arabic text-lg font-bold text-primary">
                              {rule.arabicSymbol}
                            </span>
                          </div>

                          {/* Short Cue */}
                          <p className="text-xs font-semibold text-primary/90 mt-1 mb-1">
                            💡 {rule.shortCue}
                          </p>

                          {/* Explanation */}
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {rule.explanation}
                          </p>

                          {/* Examples */}
                          {rule.examples.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {rule.examples.slice(0, 2).map((ex, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-[11px]"
                                >
                                  <span className="font-arabic text-xs font-bold text-foreground">
                                    {ex.arabic}
                                  </span>
                                  <span className="text-muted-foreground">({ex.transliteration})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Send Action */}
                        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {isSent ? "Sent to student!" : "Click to send live"}
                          </span>
                          <Button
                            size="sm"
                            variant={isSent ? "default" : "outline"}
                            className={cn(
                              "h-7 text-xs font-semibold gap-1",
                              isSent && "bg-emerald-600 hover:bg-emerald-700 text-white",
                            )}
                            onClick={() => handleSend(rule)}
                          >
                            {isSent ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Sent ✓</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                <span>Send to student</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Global Toast for Quick Picks */}
      {justSent && (
        <span className="inline-flex animate-fade-in items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <Check className="h-3 w-3" />
          <span>Sent {justSent} to student</span>
        </span>
      )}
    </div>
  )
}
