"use client"

import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, Search } from "lucide-react"
import { useState } from "react"

import type { ClassStudent } from "@/components/class-student-card"
import { OnlineDot } from "@/components/online-dot"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { classTimeToMinutes } from "@/lib/class-time"

/** Roster for the class page: quick-select (large rosters), search, and the card grid, ordered by class time. */
export function ClassStudentPicker({
  students,
  onlineIds,
  onSelect,
}: {
  students: ClassStudent[]
  onlineIds: Set<string>
  onSelect: (studentId: string) => void
}) {
  const [search, setSearch] = useState("")
  const [quickPickOpen, setQuickPickOpen] = useState(false)

  // Sort by class time ascending. AM slots before 6:00 are treated as next-day
  // (added to a 24h window) so they fall after late-evening PM slots.
  // Students without a class_time sink to the bottom, then alphabetical.
  const sortedStudents = [...students].sort((a, b) => {
    const aMin = classTimeToMinutes(a.class_time)
    const bMin = classTimeToMinutes(b.class_time)
    if (aMin == null && bMin == null) return (a.name || "").localeCompare(b.name || "")
    if (aMin == null) return 1
    if (bMin == null) return -1
    const aAdj = aMin < 360 ? aMin + 1440 : aMin
    const bAdj = bMin < 360 ? bMin + 1440 : bMin
    return aAdj - bAdj
  })

  const filteredStudents = sortedStudents.filter((s) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase()),
  )
  const showQuickPick = students.length > 20

  return (
    <div className="space-y-5">
      {/* Quick-select combobox — only shown for large rosters */}
      {showQuickPick && (
        <Popover.Root open={quickPickOpen} onOpenChange={setQuickPickOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3.5 min-h-[52px] text-left transition-all hover:border-primary/60 focus:outline-none focus:border-primary focus:border-2 focus:px-[15px] focus:py-[13px] data-[state=open]:border-primary data-[state=open]:border-2 data-[state=open]:px-[15px] data-[state=open]:py-[13px]"
            >
              <span className="text-sm text-muted-foreground">Quick select — type a name…</span>
              <ChevronDown
                className={`h-4 w-4 text-primary transition-transform ${quickPickOpen ? "rotate-180" : ""}`}
              />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={6}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
            >
              <div className="p-2 border-b border-border">
                <Input
                  autoFocus
                  placeholder="Type to filter…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {filteredStudents.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</p>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelect(s.id)
                        setQuickPickOpen(false)
                        setSearch("")
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/30 transition-colors group"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/50 text-primary text-sm font-bold">
                        {(s.name || "?").charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{s.name}</span>
                        {s.class_time && (
                          <span className="block text-xs text-muted-foreground">
                            {s.class_time}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
        <Input
          placeholder="Search students by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 bg-card border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      {/* Student card grid */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No students match &ldquo;{search}&rdquo;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredStudents.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:border-primary"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60 text-primary text-xl font-bold">
                {(s.name || "?").charAt(0).toUpperCase()}
              </span>
              {onlineIds.has(s.id) ? (
                <OnlineDot className="absolute top-3 right-3" />
              ) : (
                s.class_time && (
                  <span
                    aria-hidden
                    className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-500"
                    title={`Class at ${s.class_time}`}
                  />
                )
              )}
              <span className="w-full">
                <span className="block text-sm font-semibold truncate">{s.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                  {s.class_time ? s.class_time : "No class time set"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
