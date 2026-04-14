"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import * as Popover from "@radix-ui/react-popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuranProgress, getActiveRound, type QuranRound } from "@/components/quran-progress"
import LiveSession, { type SessionEndData } from "@/components/live-session"
import {
  Clock, User, Users, Sparkles, CalendarDays, BookMarked,
  Play, History, BookOpen, Trash2,
} from "lucide-react"
import { differenceInDays, format, formatDistanceToNow } from "date-fns"

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
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  // Delete a session
  async function confirmDeleteSession() {
    if (!sessionToDelete) return
    setDeleting(true)
    const { error } = await supabase.from("class_sessions").delete().eq("id", sessionToDelete.id)
    setDeleting(false)
    if (error) {
      alert(`Failed to delete session: ${error.message}`)
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id))
    setSessionToDelete(null)
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
      alert(`Failed to save session: ${error.message}`)
      return
    }

    setMode("landing")

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

  // Landing page
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Class Session</span>
        </h1>
        <p className="text-muted-foreground mt-1">Select a student and start a live class</p>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">No active students</p>
            <p className="text-sm text-muted-foreground">Add students to use the class session</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Select
            value={selected?.id || ""}
            onValueChange={handleSelect}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a student..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.class_time && (
                      <span className="text-muted-foreground text-xs">
                        &middot; {s.class_time}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected && (
            <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
              {/* Main Class Card */}
              <Card className="relative overflow-hidden glow-emerald">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

                <CardHeader className="relative overflow-hidden pb-4 pt-6">
                  <div className="absolute inset-0 islamic-pattern opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-card" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-bold shadow-lg">
                        {selected.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{selected.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                          <User className="h-3.5 w-3.5" />
                          <span>{selected.guardian_name}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="success" className="text-sm px-3 py-1.5">Active</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pb-6">
                  {/* Class Time & Current Para */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                        <Clock className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Class Time</p>
                        <p className="text-lg font-bold text-amber-300">{selected.class_time || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                        <BookOpen className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Currently On</p>
                        <p className="text-lg font-bold text-emerald-300">
                          {activeRound ? `Para ${currentPara}` : "Not started"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quran Progress */}
                  <QuranProgress rounds={rounds} variant="full" />

                  {/* Start Class Button */}
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30"
                    onClick={handleStartClass}
                  >
                    <Play className="h-5 w-5 mr-2 fill-current" />
                    Start Class
                  </Button>

                  {/* Days since start */}
                  <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {differenceInDays(new Date(), new Date(selected.started_at))}
                      </span>{" "}
                      days since enrollment
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Memorization Preview */}
              {memItems.length > 0 && (
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-amber-400" />
                      <CardTitle className="text-base">Memorization</CardTitle>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {memItems.filter(m => m.status === "memorizing").length} learning &middot; {memItems.filter(m => m.status === "memorized").length} done
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {memItems.filter(m => m.status === "memorizing").map((item) => (
                        <Badge key={item.id} variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-xs">
                          <Sparkles className="h-2.5 w-2.5 mr-1" />
                          {item.memorization_catalog?.title}
                        </Badge>
                      ))}
                      {memItems.filter(m => m.status === "memorized").map((item) => (
                        <Badge key={item.id} variant="outline" className="border-border/50 text-muted-foreground text-xs">
                          {item.memorization_catalog?.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Sessions */}
              {sessions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">Recent Sessions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                            <Clock className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {format(new Date(session.started_at), "MMM d, yyyy")}
                              </p>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {Math.floor(session.duration_seconds / 60)}m
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {session.paras_covered?.length > 0 && (
                                <span>Paras: {session.paras_covered.join(", ")}</span>
                              )}
                              {session.memorization_revised?.length > 0 && (
                                <>
                                  <span>&middot;</span>
                                  <span>{session.memorization_revised.length} revised</span>
                                </>
                              )}
                            </div>
                            {session.notes && (
                              <p className="text-xs text-muted-foreground/70 mt-1 truncate">{session.notes}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                            {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                          </span>
                          <Popover.Root
                            open={sessionToDelete?.id === session.id}
                            onOpenChange={(open) => setSessionToDelete(open ? session : null)}
                          >
                            <Popover.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                title="Delete session"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </Popover.Trigger>
                            <Popover.Portal>
                              <Popover.Content
                                side="top"
                                align="end"
                                sideOffset={8}
                                className="z-50 rounded-xl border border-white/[0.08] bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/50 w-52 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                              >
                                <p className="text-xs text-foreground font-medium mb-2.5">Delete this session?</p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 flex-1 text-xs"
                                    onClick={() => setSessionToDelete(null)}
                                    disabled={deleting}
                                  >
                                    No
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 flex-1 text-xs bg-red-600 hover:bg-red-500 text-white"
                                    onClick={confirmDeleteSession}
                                    disabled={deleting}
                                  >
                                    {deleting ? "..." : "Yes"}
                                  </Button>
                                </div>
                                <Popover.Arrow className="fill-card" />
                              </Popover.Content>
                            </Popover.Portal>
                          </Popover.Root>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}
