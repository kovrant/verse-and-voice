"use client"

import * as Popover from "@radix-ui/react-popover"
import { ArrowUpRight, ChevronDown, Clock, Search, Users } from "lucide-react"
import { useState } from "react"

import type { ClassStudent } from "@/components/class-student-card"
import { PanelHeader } from "@/components/panel-header"
import { StudentAvatar } from "@/components/student-avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { compareByClassTime } from "@/lib/class-time"
import { cn, COUNTRY_FLAGS } from "@/lib/utils"

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
  const onlineCount = students.filter((s) => onlineIds.has(s.id)).length

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
                      <span className="relative size-8 flex-shrink-0 overflow-hidden rounded-full">
                        <StudentAvatar
                          id={s.id}
                          name={s.name}
                          gender={s.gender}
                          sizes="32px"
                          className="object-[50%_20%]"
                          initialClassName="text-sm"
                        />
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

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelHeader
            icon={Users}
            tint="indigo"
            title="All students"
            summary={`${students.length} reading · ordered by class time${onlineCount ? ` · ${onlineCount} online` : ""}`}
          />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-tertiary" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-sm text-text-tertiary">No students match &ldquo;{search}&rdquo;</p>
          </CardContent>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredStudents.map((s) => {
              const online = onlineIds.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="group flex items-center gap-3 rounded-xl border border-card-border bg-card-background p-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-[0_8px_20px_-10px_rgba(87,80,241,0.45)] focus-visible:border-primary focus-visible:outline-none"
                >
                  <span className="relative size-12 flex-shrink-0">
                    <span className="absolute inset-0 overflow-hidden rounded-full ring-2 ring-background-gray-primary">
                      <StudentAvatar
                        id={s.id}
                        name={s.name}
                        gender={s.gender}
                        sizes="48px"
                        className="object-[50%_20%]"
                        initialClassName="text-lg"
                      />
                    </span>
                    {online && (
                      <span
                        className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card-background bg-green-500"
                        title="Online now"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {s.name}
                      </span>
                      {s.country && COUNTRY_FLAGS[s.country] && (
                        <span
                          role="img"
                          aria-label={s.country}
                          title={s.country}
                          className="flex-shrink-0 text-sm leading-none"
                        >
                          {COUNTRY_FLAGS[s.country]}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex items-center gap-1 text-xs",
                        online ? "font-medium text-green-600" : "text-text-tertiary",
                      )}
                    >
                      {online ? (
                        "Online now"
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          {s.class_time || "No class time"}
                        </>
                      )}
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-icon-tertiary transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
