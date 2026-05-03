"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import * as Popover from "@radix-ui/react-popover"
import { getActiveRound, getCompletedRounds, getChronologicalRoundNumber, type QuranRound } from "@/components/quran-progress"
import LiveSession, { type SessionEndData } from "@/components/live-session"
import {
  Clock, User, Users, Sparkles, CalendarDays, BookMarked,
  Play, BookOpen, Search, ChevronDown, ChevronLeft, UserPlus, Check,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { differenceInDays, format } from "date-fns"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  class_time: string | null
}

interface MemItem {
  id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: { id: string; title: string; category: string; image_url: string | null }
}

interface QuranPara {
  id: string
  title: string
  file_url: string
  file_type: string
  meta: Record<string, any>
}

interface ClassSession {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  starting_para: number | null
  ending_para: number | null
  paras_covered: number[]
  memorization_revised: string[]
  notes: string | null
}

type SessionMode = "landing" | "live"

export default function ClassPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [memItems, setMemItems] = useState<MemItem[]>([])
  const [paras, setParas] = useState<QuranPara[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<SessionMode>("landing")
  const [search, setSearch] = useState("")
  const [quickPickOpen, setQuickPickOpen] = useState(false)

  useEffect(() => {
    loadStudents()
    loadParas()
  }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, name, guardian_name, started_at, class_time")
      .eq("status", "Reading")
      .order("name")
    setStudents(data || [])
    setLoading(false)
  }

  async function loadParas() {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .eq("type", "quran")
      .order("created_at", { ascending: true })

    const sorted = (data || []).sort((a, b) => {
      const aNum = a.meta?.para_number || 999
      const bNum = b.meta?.para_number || 999
      return aNum - bNum
    })
    setParas(sorted)
  }

  async function handleSelect(studentId: string) {
    const student = students.find((s) => s.id === studentId) || null
    setSelected(student)
    if (student) {
      const [memResult, roundsResult, sessionsResult] = await Promise.all([
        supabase
          .from("student_memorization")
          .select("id, status, last_revised_at, memorization_catalog(id, title, category, image_url)")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("quran_rounds")
          .select("*")
          .eq("student_id", student.id)
          .order("round_number", { ascending: true }),
        supabase
          .from("class_sessions")
          .select("*")
          .eq("student_id", student.id)
          .order("started_at", { ascending: false })
          .limit(10),
      ])
      setMemItems((memResult.data as any) || [])
      setRounds(roundsResult.data || [])
      setSessions(sessionsResult.data || [])
    } else {
      setMemItems([])
      setRounds([])
      setSessions([])
    }
  }

  // Determine current para from active round
  const activeRound = getActiveRound(rounds)
  const currentPara = activeRound?.asc_completed || 1

  // Start class
  function handleStartClass() {
    setMode("live")
  }

  // End class — save session and return to landing
  async function handleEndSession(data: SessionEndData) {
    const { error } = await supabase.from("class_sessions").insert({
      student_id: selected!.id,
      started_at: data.startedAt.toISOString(),
      ended_at: data.endedAt.toISOString(),
      duration_seconds: data.durationSeconds,
      starting_para: data.startingPara,
      ending_para: data.endingPara,
      paras_covered: data.parasCovered,
      memorization_revised: data.memorizationRevised,
      notes: data.notes || null,
    })

    if (error) {
      console.error("Failed to save class session:", error)
      toast.error(`Failed to save session: ${error.message}`)
      return
    }

    setMode("landing")
    toast.success("Class session saved")

    // Reload sessions
    if (selected) {
      const { data: sessionsData } = await supabase
        .from("class_sessions")
        .select("*")
        .eq("student_id", selected.id)
        .order("started_at", { ascending: false })
        .limit(10)
      setSessions(sessionsData || [])
    }
  }

  // Live session mode
  if (mode === "live" && selected) {
    return (
      <LiveSession
        student={selected}
        rounds={rounds}
        memItems={memItems}
        paras={paras}
        initialParaNumber={currentPara}
        onEnd={handleEndSession}
        onMemItemsChange={setMemItems}
        onRoundsChange={setRounds}
      />
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-40 shimmer rounded-lg" />
          <div className="h-5 w-64 shimmer rounded-lg" />
        </div>
        <div className="h-11 w-80 shimmer rounded-xl" />
        <div className="h-80 shimmer rounded-2xl max-w-2xl mx-auto" />
      </div>
    )
  }

  // Parse "10:15 PM PKT" / "5:30 AM PKT" → minutes since midnight.
  // Returns null for missing/unparseable times.
  function classTimeToMinutes(timeStr: string | null): number | null {
    if (!timeStr) return null
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!match) return null
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3].toUpperCase()
    if (period === "PM" && hours !== 12) hours += 12
    if (period === "AM" && hours === 12) hours = 0
    return hours * 60 + minutes
  }

  // Sort by class time ascending. AM slots before 6:00 are treated as next-day
  // (added to a 24h window) so they fall after late-evening PM slots.
  // Students without a class_time sink to the bottom, then alphabetical.
  const sortedStudents = [...students].sort((a, b) => {
    const aMin = classTimeToMinutes(a.class_time)
    const bMin = classTimeToMinutes(b.class_time)
    if (aMin == null && bMin == null) return a.name.localeCompare(b.name)
    if (aMin == null) return 1
    if (bMin == null) return -1
    const aAdj = aMin < 360 ? aMin + 1440 : aMin
    const bAdj = bMin < 360 ? bMin + 1440 : bMin
    return aAdj - bAdj
  })

  const filteredStudents = sortedStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )
  const showQuickPick = students.length > 20

  // Landing page
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="mb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Class Session
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#5B8E87" }}>
          Select a student and start a live class
        </p>
      </div>

      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/60">
              <Users className="h-9 w-9 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">No students yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Add your first student to start a class session
            </p>
            <Link href="/students/new">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : selected ? (
        <>
          {/* Change-student ghost button */}
          <div>
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="inline-flex items-center gap-1 rounded-[10px] px-3.5 py-2 text-sm font-medium text-[#5B8E87] hover:text-primary hover:bg-[#F5EFE3] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Change student
            </button>
          </div>
          {selected && (
            <div className="max-w-[640px] mx-auto animate-fade-in-up">
              {/* Main Class Card — single clean white surface */}
              <div
                className="bg-white rounded-[20px] border border-[#E5DCC8] p-8"
                style={{ boxShadow: "0 4px 20px rgba(15, 118, 110, 0.06)" }}
              >
                {/* SECTION 1 — HEADER */}
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A7D7C5] text-primary text-[28px] font-bold flex-shrink-0">
                    {selected.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-heading font-semibold text-[28px] leading-tight text-[#1F2937]">
                        {selected.name}
                      </h2>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary"
                        style={{ backgroundColor: "rgba(167, 215, 197, 0.4)" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-sm font-medium" style={{ color: "#5B8E87" }}>
                      <User className="h-3.5 w-3.5" />
                      <span>{selected.guardian_name}</span>
                    </div>
                  </div>
                </div>

                <div className="my-6 h-px bg-[#F0E8D5]" />

                {/* SECTION 2 — TODAY'S SESSION */}
                <div className="flex flex-wrap gap-x-12 gap-y-5">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p
                        className="text-[11px] font-semibold uppercase"
                        style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                      >
                        Class Time
                      </p>
                      <p className="text-xl font-bold text-[#1F2937] mt-0.5">
                        {selected.class_time || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <BookOpen className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p
                        className="text-[11px] font-semibold uppercase"
                        style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                      >
                        Currently On
                      </p>
                      <p className="text-xl font-bold text-primary mt-0.5">
                        {activeRound ? `Para ${currentPara}` : "Not started"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-8" />

                {/* SECTION 3 — PROGRESS */}
                {(() => {
                  const desc = activeRound?.desc_completed || 0
                  const asc = activeRound?.asc_completed || 0
                  const total = desc + (asc > 0 ? asc - 1 : 0)
                  const percent = Math.min(100, Math.round((total / 30) * 100))
                  const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 0

                  return (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-[#1F2937]" />
                          <span className="text-base font-semibold text-[#1F2937]">Quran Progress</span>
                          {activeRound && roundNum > 0 && (
                            <span className="text-sm" style={{ color: "#5B8E87" }}>
                              (Round {roundNum})
                            </span>
                          )}
                        </div>
                        <div className="text-base font-bold tabular-nums">
                          <span className="text-primary">{currentPara || total}</span>
                          <span style={{ color: "#5B8E87" }}> / 30</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F0E8D5" }}>
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs" style={{ color: "#5B8E87" }}>
                        <span>From start: {asc > 0 ? asc : total} paras</span>
                        <span className="text-primary font-semibold">{percent}% complete</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="h-7" />

                {/* SECTION 4 — HISTORY (timeline) */}
                {(() => {
                  const completed = getCompletedRounds(rounds)
                  const active = getActiveRound(rounds)
                  if (completed.length === 0 && !active) return null

                  // Build timeline entries: completed rounds first (chronological), then active at the bottom
                  type Entry = {
                    key: string
                    stage: string
                    type: "qaida" | "quran"
                    startedAt: Date
                    endedAt: Date | null
                    isCurrent: boolean
                  }
                  const entries: Entry[] = completed.map((r) => ({
                    key: r.id,
                    stage:
                      r.type === "qaida"
                        ? "Qaida"
                        : `Quran R${getChronologicalRoundNumber(rounds, r)}`,
                    type: r.type,
                    startedAt: new Date(r.started_at),
                    endedAt: r.completed_at ? new Date(r.completed_at) : null,
                    isCurrent: false,
                  }))
                  if (active) {
                    entries.push({
                      key: active.id,
                      stage:
                        active.type === "qaida"
                          ? "Qaida"
                          : `Quran R${getChronologicalRoundNumber(rounds, active)}`,
                      type: active.type,
                      startedAt: new Date(active.started_at),
                      endedAt: null,
                      isCurrent: true,
                    })
                  }

                  // Format a duration as "Xyr Ymo" / "Ymo" / "Xd"
                  const fmtDuration = (start: Date, end: Date) => {
                    const days = Math.max(0, differenceInDays(end, start))
                    if (days < 31) return `${days}d`
                    const months = Math.round(days / 30.44)
                    if (months < 12) return `${months}mo`
                    const years = Math.floor(months / 12)
                    const remMonths = months % 12
                    return remMonths === 0 ? `${years}yr` : `${years}yr ${remMonths}mo`
                  }

                  // Total journey: earliest start → now
                  const earliest = entries.reduce(
                    (min, e) => (e.startedAt < min ? e.startedAt : min),
                    entries[0].startedAt,
                  )
                  const journey = fmtDuration(earliest, new Date())

                  return (
                    <div>
                      <div className="flex items-end justify-between mb-4">
                        <p
                          className="text-[11px] font-semibold uppercase"
                          style={{ letterSpacing: "0.08em", color: "#8B9A95" }}
                        >
                          History
                        </p>
                        <p className="text-[11px] font-semibold" style={{ color: "#5B8E87" }}>
                          <span className="font-bold text-primary">{journey}</span> of journey
                        </p>
                      </div>
                      <div className="relative pl-1">
                        {/* Connecting gradient line */}
                        <div
                          className="absolute left-[15px] top-3 bottom-3 w-[2px] rounded-full"
                          style={{
                            background:
                              "linear-gradient(to bottom, rgba(15,118,110,0.55), rgba(15,118,110,0.18))",
                          }}
                        />
                        <div className="space-y-2">
                          {entries.map((e) => {
                            const Icon = e.type === "qaida" ? BookMarked : BookOpen
                            const range = `${format(e.startedAt, "MMM yyyy")} → ${
                              e.isCurrent
                                ? "Now"
                                : e.endedAt
                                  ? format(e.endedAt, "MMM yyyy")
                                  : "…"
                            }`
                            const duration = fmtDuration(e.startedAt, e.endedAt ?? new Date())
                            return (
                              <div
                                key={e.key}
                                className="relative flex items-center gap-3 rounded-[12px] py-2 pl-10 pr-3 transition-all hover:-translate-y-px"
                                style={{
                                  backgroundColor: e.isCurrent
                                    ? "rgba(167, 215, 197, 0.28)"
                                    : "rgba(245, 240, 228, 0.55)",
                                  boxShadow: e.isCurrent
                                    ? "0 1px 0 rgba(15,118,110,0.10) inset"
                                    : undefined,
                                }}
                              >
                                {/* Dot with icon — pulses on the active round */}
                                <span
                                  className={`absolute left-[7px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] rounded-full flex items-center justify-center ring-4 ring-[#FAF6EE] ${
                                    e.isCurrent ? "bg-primary" : "bg-white border border-primary/40"
                                  }`}
                                >
                                  {e.isCurrent ? (
                                    <span className="absolute inset-0 rounded-full bg-primary/60 animate-ping" />
                                  ) : null}
                                  <Icon
                                    className="h-[10px] w-[10px] relative"
                                    style={{ color: e.isCurrent ? "#FFFFFF" : "#0F766E" }}
                                  />
                                </span>

                                <span
                                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-primary shrink-0"
                                  style={{
                                    width: 78,
                                    backgroundColor: e.isCurrent
                                      ? "rgba(15, 118, 110, 0.14)"
                                      : "rgba(167, 215, 197, 0.55)",
                                  }}
                                >
                                  {e.stage}
                                </span>

                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                  <span
                                    className="text-[13px] font-medium truncate"
                                    style={{ color: "#1F2937" }}
                                  >
                                    {range}
                                  </span>
                                  <span
                                    className="text-[11px] font-semibold tabular-nums shrink-0"
                                    style={{ color: "#5B8E87" }}
                                  >
                                    {duration}
                                  </span>
                                </div>

                                {!e.isCurrent && (
                                  <span
                                    className="shrink-0 h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center"
                                    title="Completed"
                                  >
                                    <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                                  </span>
                                )}
                                {e.isCurrent && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    Now
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div className="h-8" />

                {/* SECTION 5 — START CLASS BUTTON */}
                <button
                  type="button"
                  onClick={handleStartClass}
                  className="w-full h-14 flex items-center justify-center gap-3 rounded-[14px] bg-primary hover:bg-[#0B5E58] text-white text-[17px] font-bold transition-all hover:-translate-y-px"
                  style={{ boxShadow: "0 4px 12px rgba(15, 118, 110, 0.25)" }}
                >
                  <Play className="h-5 w-5 fill-current" />
                  Start Class
                </button>

                {/* View full profile link */}
                <div className="mt-4 mb-2 flex justify-center">
                  <Link
                    href={`/students/${selected.id}`}
                    className="text-[13px] font-medium transition-colors"
                    style={{ color: "#5B8E87" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#0F766E")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#5B8E87")}
                  >
                    View full student profile →
                  </Link>
                </div>

                {/* SECTION 6 — FOOTER META */}
                <div className="pt-4 border-t border-[#F0E8D5] flex items-center justify-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" style={{ color: "#5B8E87" }} />
                  <p className="text-[13px] font-medium" style={{ color: "#5B8E87" }}>
                    <span className="font-bold text-[#1F2937]">
                      {differenceInDays(new Date(), new Date(selected.started_at)).toLocaleString()}
                    </span>{" "}
                    days since enrollment
                  </p>
                </div>
              </div>

            </div>
          )}
        </>
      ) : (
        <div className="space-y-5">
          {/* Quick-select combobox — only shown for large rosters */}
          {showQuickPick && (
            <Popover.Root open={quickPickOpen} onOpenChange={setQuickPickOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#D4C8AE] bg-card px-4 py-3.5 min-h-[52px] text-left transition-all hover:border-primary/60 focus:outline-none focus:border-primary focus:border-2 focus:px-[15px] focus:py-[13px] data-[state=open]:border-primary data-[state=open]:border-2 data-[state=open]:px-[15px] data-[state=open]:py-[13px]"
                  style={{ boxShadow: "0 1px 3px rgba(31, 41, 55, 0.06)" }}
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
                            handleSelect(s.id)
                            setQuickPickOpen(false)
                            setSearch("")
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/30 transition-colors group"
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/50 text-primary text-sm font-bold">
                            {s.name.charAt(0)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{s.name}</span>
                            {s.class_time && (
                              <span className="block text-xs text-muted-foreground">{s.class_time}</span>
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
                <p className="text-muted-foreground">No students match "{search}"</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.id)}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_4px_16px_rgba(15,118,110,0.12)] focus-visible:border-primary"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60 text-primary text-xl font-bold">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  {s.class_time && (
                    <span
                      aria-hidden
                      className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-500"
                      title={`Class at ${s.class_time}`}
                    />
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
      )}

    </div>
  )
}
