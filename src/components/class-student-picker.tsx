"use client"

import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, Search } from "lucide-react"
import { useState } from "react"

import type { ClassStudent } from "@/components/class-student-card"
import { OnlineDot } from "@/components/online-dot"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { compareByClassTime } from "@/lib/class-time"

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

  const sortedStudents = [...students].sort(compareByClassTime)

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
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-card-border bg-card-background px-4 py-3 min-h-[48px] text-left shadow-xs transition-colors hover:border-primary/60 focus:outline-none focus:border-primary data-[state=open]:border-primary"
            >
              <span className="text-sm text-text-tertiary">Quick select — type a name…</span>
              <ChevronDown
                className={`h-4 w-4 text-icon-secondary transition-transform ${quickPickOpen ? "rotate-180" : ""}`}
              />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={6}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-card-border bg-card-background shadow-3xl overflow-hidden"
            >
              <div className="p-2 border-b border-border-primary">
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
                  <p className="px-4 py-6 text-center text-sm text-text-tertiary">No matches</p>
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
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-background-gray-primary transition-colors group"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {(s.name || "?").charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate text-text-primary">
                          {s.name}
                        </span>
                        {s.class_time && (
                          <span className="block text-xs text-text-tertiary">{s.class_time}</span>
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-tertiary pointer-events-none" />
        <Input
          placeholder="Search students by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-11"
        />
      </div>

      {/* Student card grid */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-text-tertiary">No students match &ldquo;{search}&rdquo;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredStudents.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card-background p-5 text-center transition-colors hover:border-primary/40 hover:bg-background-gray-primary focus-visible:border-primary"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
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
                <span className="block text-sm font-medium truncate text-text-primary">
                  {s.name}
                </span>
                <span className="block text-xs text-text-tertiary mt-0.5 truncate">
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
