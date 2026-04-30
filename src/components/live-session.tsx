"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { getActiveRound, type QuranRound } from "@/components/quran-progress"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import {
  ChevronLeft, ChevronRight, Clock, X, PanelLeftClose, PanelLeftOpen,
  BookMarked, Sparkles, Check, RotateCcw, Shuffle, ArrowUpRight,
  Square, FileText, BookOpen,
} from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"

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
  onEnd: (sessionData: SessionEndData) => void
  onMemItemsChange: (items: MemItem[]) => void
  onRoundsChange: (rounds: QuranRound[]) => void
}

export interface SessionEndData {
  startedAt: Date
  endedAt: Date
  durationSeconds: number
  startingPara: number
  endingPara: number
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
  student, rounds, memItems, paras, initialParaNumber,
  onEnd, onMemItemsChange, onRoundsChange,
}: LiveSessionProps) {
  const [currentParaNumber, setCurrentParaNumber] = useState(initialParaNumber)
  const [parasViewed, setParasViewed] = useState<Set<number>>(() => new Set([initialParaNumber]))
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (showEndDialog) return
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === "ArrowLeft") navigatePara("prev")
      if (e.key === "ArrowRight") navigatePara("next")
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [currentParaNumber, paras, showEndDialog])

  const currentPara = paras.find(p => p.meta?.para_number === currentParaNumber) || null

  function navigatePara(direction: "prev" | "next") {
    const next = direction === "prev" ? currentParaNumber - 1 : currentParaNumber + 1
    if (next < 1 || next > 30) return
    setCurrentParaNumber(next)
    setParasViewed(prev => { const s = new Set(Array.from(prev)); s.add(next); return s })
  }

  // Memorization
  const memorizing = memItems.filter(m => m.status === "memorizing")
  const memorized = memItems.filter(m => m.status === "memorized")

  function pickRevision() {
    if (memorized.length === 0) return
    const sorted = [...memorized].sort((a, b) => {
      const aTime = a.last_revised_at ? new Date(a.last_revised_at).getTime() : 0
      const bTime = b.last_revised_at ? new Date(b.last_revised_at).getTime() : 0
      return aTime - bTime
    })
    setRevisionPick(sorted[0])
  }

  async function markRevised(id: string) {
    const item = memItems.find(m => m.id === id)
    if (item) {
      setRevisionsThisSession(prev => [...prev, item.memorization_catalog?.title])
    }

    await supabase
      .from("student_memorization")
      .update({ last_revised_at: new Date().toISOString() })
      .eq("id", id)

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
    const newAsc = currentParaNumber + 1
    await supabase
      .from("quran_rounds")
      .update({ asc_completed: newAsc })
      .eq("id", activeRound.id)

    const { data } = await supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("round_number", { ascending: true })
    onRoundsChange(data || [])
  }

  const canAdvance = activeRound && currentParaNumber >= (activeRound.asc_completed || 1)

  // End class
  async function handleEndClass() {
    setSaving(true)
    const endedAt = new Date()
    const sessionData: SessionEndData = {
      startedAt,
      endedAt,
      durationSeconds: Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
      startingPara: initialParaNumber,
      endingPara: currentParaNumber,
      parasCovered: Array.from(parasViewed).sort((a, b) => a - b),
      memorizationRevised: revisionsThisSession,
      notes,
    }
    onEnd(sessionData)
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5DCC8] bg-white">
        <div className="flex items-center gap-4">
          {/* Student name */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              {student.name.charAt(0)}
            </div>
            <span className="font-semibold text-sm text-[#1F2937]">{student.name}</span>
          </div>

          <div className="h-5 w-px bg-[#E5DCC8]" />

          {/* Para info */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => navigatePara("prev")}
              disabled={currentParaNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center text-[#1F2937]">
              Para <span className="text-primary font-bold">{currentParaNumber}</span>
              <span className="text-[#5B8E87] text-xs ml-1">/ 30</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => navigatePara("next")}
              disabled={currentParaNumber >= 30}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer — white pill, deep ink digits */}
          <div className="flex items-center gap-1.5 px-[14px] py-2 rounded-full bg-white border border-[#E5DCC8]">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold text-[#1F2937] tabular-nums">{formatTimer(elapsed)}</span>
          </div>

          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
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
          <div className="w-80 border-r border-[#E5DCC8] bg-white overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-5">
              {/* Quick Actions */}
              {canAdvance && (
                <div className="space-y-2.5">
                  <p
                    className="text-[11px] font-semibold uppercase"
                    style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                  >
                    Quick Actions
                  </p>
                  <button
                    type="button"
                    onClick={advancePara}
                    className="group w-full flex items-center justify-center gap-2 rounded-[10px] px-[14px] py-2.5 bg-white border border-primary text-primary text-sm font-semibold transition-colors hover:bg-primary hover:text-white"
                  >
                    <ArrowUpRight className="h-4 w-4 transition-colors" />
                    Advance to Para {currentParaNumber + 1}
                  </button>
                </div>
              )}

              {/* Current progress — inline, no panel */}
              {activeRound && (
                <>
                  {canAdvance && <div className="h-px bg-[#F0E8D5]" />}
                  <div className="space-y-1">
                    <p
                      className="text-[11px] font-semibold uppercase"
                      style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                    >
                      Current Progress
                    </p>
                    <p className="text-sm text-[#1F2937]">
                      Student is on Para{" "}
                      <span className="text-primary font-bold">{activeRound.asc_completed || 1}</span>
                    </p>
                    {activeRound.desc_completed > 0 && (
                      <p className="text-xs" style={{ color: "#5B8E87" }}>
                        From end: {activeRound.desc_completed} paras
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Memorization */}
              {memItems.length > 0 && (
                <>
                  <div className="h-px bg-[#F0E8D5]" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <BookMarked className="h-3.5 w-3.5 text-primary" />
                      <p
                        className="text-[11px] font-semibold uppercase"
                        style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                      >
                        Memorization
                      </p>
                    </div>

                    {memorizing.length > 0 && (
                      <div className="space-y-1.5">
                        <p
                          className="text-[10px] font-semibold uppercase flex items-center gap-1"
                          style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                        >
                          <Sparkles className="h-2.5 w-2.5 text-primary" />
                          Currently Memorizing
                        </p>
                        {memorizing.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-[10px] border border-[#E5DCC8] bg-white px-3 py-2.5"
                          >
                            {item.memorization_catalog?.image_url && (
                              <img
                                src={item.memorization_catalog.image_url}
                                alt=""
                                className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <p className="text-sm font-medium text-[#1F2937]">
                              {item.memorization_catalog?.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {memorized.length > 0 && (
                      <div className="space-y-1.5">
                        <p
                          className="text-[10px] font-semibold uppercase flex items-center gap-1"
                          style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                        >
                          <Check className="h-2.5 w-2.5 text-primary" />
                          Memorized ({memorized.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {memorized.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#E5DCC8] bg-white"
                              style={{ color: "#5B8E87" }}
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
                          <div className="rounded-[10px] border border-[#E5DCC8] bg-white p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw className="h-3 w-3 text-primary" />
                              <p
                                className="text-[10px] font-semibold uppercase"
                                style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
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
                              <p className="text-base font-bold text-[#1F2937]">
                                {revisionPick.memorization_catalog?.title}
                              </p>
                            </div>
                            {revisionPick.last_revised_at && (
                              <p className="text-[10px]" style={{ color: "#5B8E87" }}>
                                Last: {format(new Date(revisionPick.last_revised_at), "MMM d")}
                                {" "}({differenceInCalendarDays(new Date(), new Date(revisionPick.last_revised_at))}d ago)
                              </p>
                            )}
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-xs" onClick={() => markRevised(revisionPick.id)}>
                                <Check className="h-3 w-3 mr-1" />
                                Revised
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={pickRevision}>
                                <Shuffle className="h-3 w-3 mr-1" />
                                Another
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={pickRevision} className="w-full text-xs">
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
              <div className="h-px bg-[#F0E8D5]" />
              <div className="space-y-1.5">
                <p
                  className="text-[11px] font-semibold uppercase"
                  style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                >
                  This Session
                </p>
                <div className="text-sm space-y-0.5">
                  <p style={{ color: "#5B8E87" }}>
                    Paras viewed:{" "}
                    <span className="font-bold text-[#1F2937] tabular-nums">{parasViewed.size}</span>
                  </p>
                  <p style={{ color: "#5B8E87" }}>
                    Revisions done:{" "}
                    <span className="font-bold text-[#1F2937] tabular-nums">{revisionsThisSession.length}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quran Para Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentPara ? (
            <div className="flex-1 overflow-auto">
              {currentPara.file_type === "pdf" ? (
                <iframe
                  src={currentPara.file_url}
                  className="w-full h-full"
                  title={currentPara.title}
                />
              ) : (
                <div className="flex items-center justify-center p-4 h-full">
                  <img
                    src={currentPara.file_url}
                    alt={currentPara.title}
                    className="max-w-full max-h-full object-contain rounded-xl"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <BookOpen className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Para {currentParaNumber} not uploaded</p>
                <p className="text-sm text-muted-foreground">Upload this para from the Media Library</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Class Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent
          className="max-w-md bg-white border border-[#E5DCC8] rounded-[20px] p-8"
          style={{ boxShadow: "0 20px 60px rgba(15, 118, 110, 0.15)" }}
        >
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-[22px] font-bold text-[#1F2937]">
              End Class Session
            </DialogTitle>
            <DialogDescription className="text-sm font-medium" style={{ color: "#5B8E87" }}>
              Review the session summary and add any notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Stats — clean two-column, no fills */}
            <div className="grid grid-cols-2 gap-6 py-5 border-y border-[#F0E8D5]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" style={{ color: "#5B8E87" }} />
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                  >
                    Duration
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#1F2937] tabular-nums">
                  {formatDuration(elapsed)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4" style={{ color: "#5B8E87" }} />
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                  >
                    Paras Covered
                  </span>
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {Array.from(parasViewed).sort((a, b) => a - b).join(", ")}
                </div>
              </div>
            </div>

            {/* Revisions */}
            {revisionsThisSession.length > 0 && (
              <div className="space-y-2">
                <span
                  className="text-[11px] font-semibold uppercase"
                  style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                >
                  Memorization Revised
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {revisionsThisSession.map((title, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary"
                      style={{ backgroundColor: "rgba(167, 215, 197, 0.4)" }}
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#1F2937]">
                Notes (optional)
              </label>
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
              className="px-5 py-3 rounded-[10px] text-[15px] font-semibold transition-colors hover:bg-[#F5EFE3]"
              style={{ color: "#5B8E87" }}
            >
              Continue Class
            </button>
            <button
              type="button"
              onClick={handleEndClass}
              disabled={saving}
              className="px-6 py-3 rounded-[10px] bg-primary hover:bg-[#0B5E58] text-white text-[15px] font-bold transition-colors disabled:opacity-60"
              style={{ boxShadow: "0 2px 8px rgba(15, 118, 110, 0.2)" }}
            >
              {saving ? "Saving..." : "Save & End"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
