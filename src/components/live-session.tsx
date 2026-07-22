"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { differenceInCalendarDays, format } from "date-fns"
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getActiveRound, type QuranRound } from "@/components/quran-progress"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { loadLastPage, saveLastPage } from "@/lib/para-progress"
import { supabase } from "@/lib/supabase"
import { useClassChannel } from "@/lib/use-class-channel"
import { formatLocalDate } from "@/lib/utils"

// react-pdf renders client-side only.
const SyncedPdfViewer = dynamic(
  () => import("@/components/synced-pdf-viewer").then((m) => m.SyncedPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

interface QuranPara {
  id: string
  title: string
  file_url: string
  file_type: string
  meta: Record<string, any>
}

interface MemItem {
  id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: { id: string; title: string; category: string; image_url: string | null }
}

interface LiveSessionProps {
  student: { id: string; name: string; guardian_name: string }
  rounds: QuranRound[]
  memItems: MemItem[]
  paras: QuranPara[]
  initialParaNumber: number
  // Returns false if the save failed so the live session can recover.
  onEnd: (sessionData: SessionEndData) => void | boolean | Promise<void | boolean>
  onMemItemsChange: (items: MemItem[]) => void
  onRoundsChange: (rounds: QuranRound[]) => void
}

export interface SessionEndData {
  startedAt: Date
  endedAt: Date
  durationSeconds: number
  startingPara: number
  endingPara: number
  endingPage: number
  parasCovered: number[]
  memorizationRevised: string[]
  notes: string
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function LiveSession({
  student,
  rounds,
  memItems,
  paras,
  initialParaNumber,
  onEnd,
  onMemItemsChange,
  onRoundsChange,
}: LiveSessionProps) {
  const [currentParaNumber, setCurrentParaNumber] = useState(initialParaNumber)
  const [parasViewed, setParasViewed] = useState<Set<number>>(() => new Set([initialParaNumber]))
  const [pdfPage, setPdfPage] = useState(1)
  const [startedAt] = useState(() => new Date())
  const [elapsed, setElapsed] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [revisionPick, setRevisionPick] = useState<MemItem | null>(null)
  const [revisionsThisSession, setRevisionsThisSession] = useState<string[]>([])
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { setVisible: setAppSidebarVisible } = useSidebarVisibility()

  // Hide the app sidebar for the duration of the live session; restore on unmount.
  useEffect(() => {
    setAppSidebarVisible(false)
    return () => setAppSidebarVisible(true)
  }, [setAppSidebarVisible])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  // Beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [])

  // Arrow keys page through the PDF (handled inside <SyncedPdfViewer>).
  // Para switching is an explicit button in the top bar.

  const currentPara = paras.find((p) => p.meta?.para_number === currentParaNumber) || null

  function navigatePara(direction: "prev" | "next") {
    const next = direction === "prev" ? currentParaNumber - 1 : currentParaNumber + 1
    if (next < 1 || next > 30) return
    setCurrentParaNumber(next)
    setPdfPage(1)
    setParasViewed((prev) => {
      const s = new Set(Array.from(prev))
      s.add(next)
      return s
    })
  }

  // ── Realtime: the teacher hosts the live class channel ──
  // Echo guard by VALUE: remember the last position the student pushed us to and
  // only broadcast when ours differs — immune to duplicate/no-op broadcasts.
  const lastRemote = useRef<{ paraNumber: number; page: number } | null>(null)
  const {
    live: studentJoined,
    sendNav,
    endClass,
  } = useClassChannel({
    studentId: student.id,
    role: "teacher",
    onNav: (nav) => {
      // The teacher leads the para; only accept the student's PAGE turns within
      // the teacher's current para. Ignore any other-para position (e.g. the
      // student's pre-sync default of para 1), which must not move the teacher.
      if (nav.paraNumber !== currentParaNumber) return
      if (nav.page === pdfPage) return
      lastRemote.current = { paraNumber: nav.paraNumber, page: nav.page }
      setPdfPage(nav.page)
    },
    // A student just joined → push our authoritative position so they land here.
    onPeerJoin: () => sendNav({ paraNumber: currentParaNumber, page: pdfPage }),
  })

  // Broadcast the teacher's position on every local change (skip our own echoes).
  useEffect(() => {
    const lr = lastRemote.current
    if (lr && lr.paraNumber === currentParaNumber && lr.page === pdfPage) return
    sendNav({ paraNumber: currentParaNumber, page: pdfPage })
  }, [currentParaNumber, pdfPage, sendNav])

  // ── Persist the reading position (student_para_progress) ──
  const currentParaRef = useRef(currentParaNumber)
  currentParaRef.current = currentParaNumber

  // Debounced save of the current page for this para.
  useEffect(() => {
    const t = setTimeout(() => {
      saveLastPage(student.id, currentParaNumber, pdfPage)
    }, 1200)
    return () => clearTimeout(t)
  }, [student.id, currentParaNumber, pdfPage])

  // Resume the starting para at its last-read page (once, on open).
  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true
    loadLastPage(student.id, initialParaNumber).then((p) => {
      if (p > 1 && currentParaRef.current === initialParaNumber) setPdfPage(p)
    })
  }, [student.id, initialParaNumber])

  // Memorization
  const memorizing = memItems.filter((m) => m.status === "memorizing")
  const memorized = memItems.filter((m) => m.status === "memorized")

  function pickRevision() {
    if (memorized.length === 0) return
    const sorted = [...memorized].sort((a, b) => {
      const aTime = a.last_revised_at ? new Date(a.last_revised_at).getTime() : 0
      const bTime = b.last_revised_at ? new Date(b.last_revised_at).getTime() : 0
      return aTime - bTime
    })
    // "Another" should actually change the pick: exclude the current one, then
    // choose randomly among the least-recently-revised few for some variety.
    const pool = revisionPick ? sorted.filter((m) => m.id !== revisionPick.id) : sorted
    const candidates = pool.length > 0 ? pool : sorted
    const topN = candidates.slice(0, Math.min(3, candidates.length))
    setRevisionPick(topN[Math.floor(Math.random() * topN.length)])
  }

  async function markRevised(id: string) {
    const { error } = await supabase
      .from("student_memorization")
      .update({ last_revised_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      toast.error(`Couldn't record revision: ${error.message}`)
      return
    }

    // Only count the revision once the DB write succeeded, and only if the item
    // actually has a title (avoid pushing undefined into the string[]).
    const item = memItems.find((m) => m.id === id)
    const title = item?.memorization_catalog?.title
    if (title) {
      setRevisionsThisSession((prev) => [...prev, title])
    }

    const { data } = await supabase
      .from("student_memorization")
      .select("id, status, last_revised_at, memorization_catalog(id, title, category, image_url)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
    onMemItemsChange((data as any) || [])
    setRevisionPick(null)
  }

  // Advance para progress
  const activeRound = getActiveRound(rounds)

  async function advancePara() {
    if (!activeRound) return
    // Finishing the final para completes the round. asc_completed is 1-indexed
    // ("currently on para N"), and the DB caps it at 30 — so we must not write 31.
    // Instead mark the round completed using the same shape as a finished round.
    const finishing = currentParaNumber >= 30
    const update = finishing
      ? {
          desc_completed: 30,
          asc_completed: 0,
          completed_at: formatLocalDate(),
        }
      : { asc_completed: currentParaNumber + 1 }

    const { error } = await supabase.from("quran_rounds").update(update).eq("id", activeRound.id)

    if (error) {
      toast.error(`Couldn't update progress: ${error.message}`)
      return
    }

    const { data } = await supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("round_number", { ascending: true })
    onRoundsChange(data || [])

    if (finishing) toast.success("Round complete — all 30 paras done!")
  }

  const canAdvance = activeRound && currentParaNumber >= (activeRound.asc_completed || 1)

  // End class
  async function handleEndClass() {
    setSaving(true)
    // Tell the student first so they close immediately (before the channel is
    // torn down on unmount — presence-leave alone is too slow/unreliable).
    endClass()
    const endedAt = new Date()
    const sessionData: SessionEndData = {
      startedAt,
      endedAt,
      durationSeconds: Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
      startingPara: initialParaNumber,
      endingPara: currentParaNumber,
      endingPage: pdfPage,
      parasCovered: Array.from(parasViewed).sort((a, b) => a - b),
      memorizationRevised: revisionsThisSession,
      notes,
    }
    try {
      const result = await onEnd(sessionData)
      // A false result means the save failed — re-enable the button so the
      // teacher can retry instead of being stuck on "Saving..." forever.
      if (result === false) setSaving(false)
    } catch (e) {
      console.error("Failed to end session:", e)
      toast.error("Couldn't save the session. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          {/* Student name */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              {student.name.charAt(0)}
            </div>
            <span className="font-semibold text-sm text-foreground">{student.name}</span>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Para switcher — explicit buttons (the ← → arrows page the PDF). */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Para <span className="text-primary font-bold">{currentParaNumber}</span>
              <span className="text-muted-foreground text-xs ml-1">/ 30</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigatePara("prev")}
              disabled={currentParaNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-0.5 hidden sm:inline">Prev para</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5"
              onClick={() => navigatePara("next")}
              disabled={currentParaNumber >= 30}
            >
              <span className="mr-0.5 hidden sm:inline">Next para</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Live presence */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              studentJoined
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                studentJoined ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
              }`}
            />
            {studentJoined ? "Student joined" : "Waiting for student…"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer — white pill, deep ink digits */}
          <div className="flex items-center gap-1.5 px-[14px] py-2 rounded-full bg-card border border-border">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatTimer(elapsed)}
            </span>
          </div>

          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          {/* End Class */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndDialog(true)}
            className="gap-1.5"
          >
            <Square className="h-3 w-3 fill-current" />
            End Class
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-r border-border bg-card overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-5">
              {/* Quick Actions */}
              {canAdvance && (
                <div className="space-y-2.5">
                  <p
                    className="text-[11px] font-semibold uppercase text-muted-foreground"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Quick Actions
                  </p>
                  <button
                    type="button"
                    onClick={advancePara}
                    className="group w-full flex items-center justify-center gap-2 rounded-[10px] px-[14px] py-2.5 bg-card border border-primary text-primary text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <ArrowUpRight className="h-4 w-4 transition-colors" />
                    Advance to Para {currentParaNumber + 1}
                  </button>
                </div>
              )}

              {/* Current progress — inline, no panel */}
              {activeRound && (
                <>
                  {canAdvance && <div className="h-px bg-border" />}
                  <div className="space-y-1">
                    <p
                      className="text-[11px] font-semibold uppercase text-muted-foreground"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      Current Progress
                    </p>
                    <p className="text-sm text-foreground">
                      Student is on Para{" "}
                      <span className="text-primary font-bold">
                        {activeRound.asc_completed || 1}
                      </span>
                    </p>
                    {activeRound.desc_completed > 0 && (
                      <p className="text-xs text-muted-foreground">
                        From end: {activeRound.desc_completed} paras
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Memorization */}
              {memItems.length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <BookMarked className="h-3.5 w-3.5 text-primary" />
                      <p
                        className="text-[11px] font-semibold uppercase text-muted-foreground"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        Memorization
                      </p>
                    </div>

                    {memorizing.length > 0 && (
                      <div className="space-y-1.5">
                        <p
                          className="text-[10px] font-semibold uppercase flex items-center gap-1 text-muted-foreground"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          <Sparkles className="h-2.5 w-2.5 text-primary" />
                          Currently Memorizing
                        </p>
                        {memorizing.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5"
                          >
                            {item.memorization_catalog?.image_url && (
                              <img
                                src={item.memorization_catalog.image_url}
                                alt=""
                                className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <p className="text-sm font-medium text-foreground">
                              {item.memorization_catalog?.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {memorized.length > 0 && (
                      <div className="space-y-1.5">
                        <p
                          className="text-[10px] font-semibold uppercase flex items-center gap-1 text-muted-foreground"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          <Check className="h-2.5 w-2.5 text-primary" />
                          Memorized ({memorized.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {memorized.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-card text-muted-foreground"
                            >
                              {item.memorization_catalog?.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Revision Picker */}
                    {memorized.length > 0 && (
                      <div className="pt-1">
                        {revisionPick ? (
                          <div className="rounded-[10px] border border-border bg-card p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw className="h-3 w-3 text-primary" />
                              <p
                                className="text-[10px] font-semibold uppercase text-muted-foreground"
                                style={{ letterSpacing: "0.08em" }}
                              >
                                Revision Pick
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {revisionPick.memorization_catalog?.image_url && (
                                <img
                                  src={revisionPick.memorization_catalog.image_url}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <p className="text-base font-bold text-foreground">
                                {revisionPick.memorization_catalog?.title}
                              </p>
                            </div>
                            {revisionPick.last_revised_at && (
                              <p className="text-[10px] text-muted-foreground">
                                Last: {format(new Date(revisionPick.last_revised_at), "MMM d")} (
                                {differenceInCalendarDays(
                                  new Date(),
                                  new Date(revisionPick.last_revised_at),
                                )}
                                d ago)
                              </p>
                            )}
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => markRevised(revisionPick.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Revised
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={pickRevision}
                              >
                                <Shuffle className="h-3 w-3 mr-1" />
                                Another
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={pickRevision}
                            className="w-full text-xs"
                          >
                            <Shuffle className="h-3 w-3 mr-1.5" />
                            Pick Revision
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* This Session — inline, no panel */}
              <div className="h-px bg-border" />
              <div className="space-y-1.5">
                <p
                  className="text-[11px] font-semibold uppercase text-muted-foreground"
                  style={{ letterSpacing: "0.08em" }}
                >
                  This Session
                </p>
                <div className="text-sm space-y-0.5">
                  <p className="text-muted-foreground">
                    Paras viewed:{" "}
                    <span className="font-bold text-foreground tabular-nums">
                      {parasViewed.size}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Revisions done:{" "}
                    <span className="font-bold text-foreground tabular-nums">
                      {revisionsThisSession.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quran Para Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentPara ? (
            currentPara.file_type === "pdf" ? (
              <SyncedPdfViewer
                fileUrl={currentPara.file_url}
                page={pdfPage}
                onPageChange={setPdfPage}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                <img
                  src={currentPara.file_url}
                  alt={currentPara.title}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <BookOpen className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Para {currentParaNumber} not uploaded</p>
                <p className="text-sm text-muted-foreground">
                  Upload this para from the Media Library
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Class Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="max-w-md bg-card border border-border rounded-[20px] p-8">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-[22px] font-bold text-foreground">
              End Class Session
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              Review the session summary and add any notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Stats — clean two-column, no fills */}
            <div className="grid grid-cols-2 gap-6 py-5 border-y border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="text-[11px] font-semibold uppercase text-muted-foreground"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Duration
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {formatDuration(elapsed)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="text-[11px] font-semibold uppercase text-muted-foreground"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Paras Covered
                  </span>
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {Array.from(parasViewed)
                    .sort((a, b) => a - b)
                    .join(", ")}
                </div>
              </div>
            </div>

            {/* Revisions */}
            {revisionsThisSession.length > 0 && (
              <div className="space-y-2">
                <span
                  className="text-[11px] font-semibold uppercase text-muted-foreground"
                  style={{ letterSpacing: "0.08em" }}
                >
                  Memorization Revised
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {revisionsThisSession.map((title, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground">Notes (optional)</label>
              <Textarea
                placeholder="How did the session go? Any observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[110px] px-4 py-3.5 text-[15px] font-medium leading-relaxed resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 mt-2">
            <button
              type="button"
              onClick={() => setShowEndDialog(false)}
              className="px-5 py-3 rounded-[10px] text-[15px] font-semibold transition-colors hover:bg-muted text-muted-foreground"
            >
              Continue Class
            </button>
            <button
              type="button"
              onClick={handleEndClass}
              disabled={saving}
              className="px-6 py-3 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-[15px] font-bold transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save & End"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
