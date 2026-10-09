"use client"

import * as Popover from "@radix-ui/react-popover"
import { subMonths } from "date-fns"
import { BookMarked, BookOpen, CalendarDays, Clock, FileText, History, Trash2 } from "lucide-react"
import { useState } from "react"

import { type ClassSession, paraSummary, SessionStat } from "@/components/student-session-bits"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { formatSessionDuration, safeFormatDate, safeFormatDistanceToNow } from "@/lib/utils"

const SESSION_PAGE_SIZE = 10

/** Teacher's class-session history for one student: summary, cleanup, paged list with delete. */
export function StudentSessionsList({
  studentId,
  studentName,
  sessions,
  onSessionsChange,
  onReload,
}: {
  studentId: string
  studentName: string
  sessions: ClassSession[]
  onSessionsChange: (sessions: ClassSession[]) => void
  onReload: () => Promise<void>
}) {
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null)
  const [deletingSession, setDeletingSession] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleaningOld, setCleaningOld] = useState(false)

  async function deleteSession() {
    if (!sessionToDelete) return
    setDeletingSession(true)
    const { error } = await supabase.from("class_sessions").delete().eq("id", sessionToDelete.id)
    setDeletingSession(false)
    if (error) {
      toast.error(`Failed to delete session: ${error.message}`)
      return
    }
    const remaining = sessions.filter((s) => s.id !== sessionToDelete.id)
    onSessionsChange(remaining)
    // If the current page would be empty after this delete, jump back one page
    const newTotalPages = Math.max(1, Math.ceil(remaining.length / SESSION_PAGE_SIZE))
    if (sessionPage > newTotalPages) {
      setSessionPage(newTotalPages)
    }
    toast.success("Session deleted")
    setSessionToDelete(null)
  }

  // Purge sessions older than one month — keeps only the last month on record.
  async function deleteOldSessions() {
    setCleaningOld(true)
    const cutoff = subMonths(new Date(), 1)
    const { error } = await supabase
      .from("class_sessions")
      .delete()
      .eq("student_id", studentId)
      .lt("started_at", cutoff.toISOString())
    setCleaningOld(false)
    if (error) {
      toast.error(`Failed to clean up sessions: ${error.message}`)
      return
    }
    setCleanupOpen(false)
    await onReload()
    setSessionPage(1)
    toast.success("Removed sessions older than 1 month")
  }

  const now = new Date()
  const lastSession = sessions[0]
  const totalSessions = sessions.length
  const totalSessionPages = Math.max(1, Math.ceil(totalSessions / SESSION_PAGE_SIZE))
  const startIdx = (sessionPage - 1) * SESSION_PAGE_SIZE
  const paginatedSessions = sessions.slice(startIdx, startIdx + SESSION_PAGE_SIZE)
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
  const thisMonthCount = sessions.filter((s) => {
    const d = new Date(s.started_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const cleanupCutoff = subMonths(now, 1)
  const oldSessionsCount = sessions.filter((s) => new Date(s.started_at) < cleanupCutoff).length
  const handlePageChange = (page: number) => {
    setSessionPage(page)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("sessions-list-top")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Class Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Recorded lessons, duration, and teacher notes
          </p>
        </div>
      </div>

      {totalSessions === 0 ? (
        <div className="py-12 text-center bg-card rounded-2xl border border-border">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/40">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">No sessions yet</p>
          <p className="text-xs text-muted-foreground">
            Sessions will appear here after the first class
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SessionStat
              icon={History}
              tint="text-emerald-600 bg-emerald-500/10"
              value={totalSessions}
              label="Total sessions"
            />
            <SessionStat
              icon={Clock}
              tint="text-blue-500 bg-blue-500/10"
              value={formatSessionDuration(totalSeconds)}
              label="Time together"
            />
            <SessionStat
              icon={CalendarDays}
              tint="text-purple-500 bg-purple-500/10"
              value={thisMonthCount}
              label="This month"
            />
            <SessionStat
              icon={BookOpen}
              tint="text-amber-600 bg-amber-500/10"
              value={lastSession ? safeFormatDate(lastSession.started_at, "MMM d") : "--"}
              label="Last class"
            />
          </div>

          {/* Cleanup toolbar — only when there are sessions older than 1 month */}
          {oldSessionsCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{oldSessionsCount}</span> session
                {oldSessionsCount === 1 ? "" : "s"} older than 1 month
              </p>
              <Popover.Root open={cleanupOpen} onOpenChange={setCleanupOpen}>
                <Popover.Trigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear old sessions
                  </Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    className="z-50 w-64 rounded-xl border border-border bg-card p-3 shadow-lg"
                  >
                    <p className="mb-1 text-sm font-semibold text-foreground">
                      Delete {oldSessionsCount} old session
                      {oldSessionsCount === 1 ? "" : "s"}?
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      This removes every session older than 1 month for {studentName}. Only the
                      last month is kept. This can&rsquo;t be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => setCleanupOpen(false)}
                        disabled={cleaningOld}
                      >
                        Cancel
                      </Button>
                      <button
                        type="button"
                        className="h-7 flex-1 rounded-md text-xs font-semibold bg-destructive text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                        onClick={deleteOldSessions}
                        disabled={cleaningOld}
                      >
                        {cleaningOld ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                    <Popover.Arrow className="fill-border" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>
          )}

          {/* Sessions table */}
          <div
            id="sessions-list-top"
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/30 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {totalSessions} {totalSessions === 1 ? "Session" : "Sessions"}
              </p>
              <span className="text-[11px] font-medium text-muted-foreground">Newest first ↓</span>
            </div>

            <div className="max-h-[520px] overflow-y-auto main-scroll">
              {paginatedSessions.map((session, i) => {
                const paras = paraSummary(session)
                const revised = session.memorization_revised?.length || 0
                return (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 ${
                      i < paginatedSessions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-secondary/40">
                      <span className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">
                        {safeFormatDate(session.started_at, "MMM")}
                      </span>
                      <span className="font-heading text-lg font-bold leading-tight tabular-nums text-foreground">
                        {safeFormatDate(session.started_at, "d")}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {safeFormatDate(session.started_at, "EEEE")}
                        </p>
                        <span className="text-muted-foreground/40">&middot;</span>
                        <span className="text-[13px] text-muted-foreground">
                          {safeFormatDate(session.started_at, "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatSessionDuration(session.duration_seconds)}
                        </span>
                        {paras && (
                          <span
                            title={paras.title}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600"
                          >
                            <BookOpen className="h-3 w-3" />
                            {paras.label}
                          </span>
                        )}
                        {revised > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                            <BookMarked className="h-3 w-3" />
                            {revised} revised
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <FileText className="mt-0.5 h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{session.notes}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <span className="hidden text-[11px] text-muted-foreground sm:block">
                        {safeFormatDistanceToNow(session.started_at, { addSuffix: true })}
                      </span>
                      <Popover.Root
                        open={sessionToDelete?.id === session.id}
                        onOpenChange={(open) => setSessionToDelete(open ? session : null)}
                      >
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            title="Delete session"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            side="top"
                            align="end"
                            sideOffset={8}
                            className="z-50 rounded-xl border border-border bg-card p-3 shadow-lg w-52"
                          >
                            <p className="text-xs font-medium mb-2.5 text-foreground">
                              Delete this session?
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 flex-1 text-xs"
                                onClick={() => setSessionToDelete(null)}
                                disabled={deletingSession}
                              >
                                No
                              </Button>
                              <button
                                type="button"
                                className="h-7 flex-1 text-xs rounded-md font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                                onClick={deleteSession}
                                disabled={deletingSession}
                              >
                                {deletingSession ? "..." : "Yes"}
                              </button>
                            </div>
                            <Popover.Arrow className="fill-border" />
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {totalSessions > SESSION_PAGE_SIZE && (
            <Pagination
              currentPage={sessionPage}
              totalPages={totalSessionPages}
              totalItems={totalSessions}
              pageSize={SESSION_PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  )
}
