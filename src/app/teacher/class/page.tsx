"use client"

import { ChevronLeft, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"

import {
  classPosition,
  type ClassSession,
  type ClassStudent,
  ClassStudentCard,
} from "@/components/class-student-card"
import { ClassStudentPicker } from "@/components/class-student-picker"
import { ClassTodayAttendance } from "@/components/class-today-attendance"
import LiveSession, { type SessionEndData } from "@/components/live-session"
import { PageLoading } from "@/components/page-loading"
import { type QuranRound } from "@/components/quran-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { syncQuranRoundAchievements } from "@/lib/achievements"
import { MEM_ITEM_SELECT, type MemItem } from "@/lib/memorization"
import { pktDateKey } from "@/lib/monthly-report"
import { saveBookmark, savePageKeepingBookmark } from "@/lib/para-progress"
import { QAIDA_PARA, resolveAssignedQaida } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useOnlineStudents } from "@/lib/use-online-students"

interface QuranPara {
  id: string
  title: string
  file_url: string
  file_type: string
  meta: Record<string, any>
}

type SessionMode = "landing" | "live"

export default function ClassPage() {
  return (
    <Suspense fallback={<PageLoading variant="class-session" />}>
      <ClassPageContent />
    </Suspense>
  )
}

function ClassPageContent() {
  const searchParams = useSearchParams()
  const preselected = useRef(false)
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [selected, setSelected] = useState<ClassStudent | null>(null)
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [memItems, setMemItems] = useState<MemItem[]>([])
  const [paras, setParas] = useState<QuranPara[]>([])
  // The selected student's assigned Qaida book (students.qaida_media_id).
  const [qaidaBook, setQaidaBook] = useState<QuranPara | null>(null)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  // Qaida course: the card this student is on (students.qaida_card_id).
  const [qaidaCardId, setQaidaCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<SessionMode>("landing")
  const [starting, setStarting] = useState(false)
  const onlineStudents = useOnlineStudents()
  // Monotonic token so a slow load for an earlier selection can't overwrite a
  // newer one (clicking A then B quickly).
  const selectSeq = useRef(0)

  useEffect(() => {
    loadStudents()
    loadParas()
  }, [])

  const handleSelect = useCallback(
    async (studentId: string) => {
      const seq = ++selectSeq.current
      const student = students.find((s) => s.id === studentId) || null
      setSelected(student)
      if (student) {
        const [memResult, roundsResult, sessionsResult, qaidaResult, cardResult] =
          await Promise.all([
            supabase
              .from("student_memorization")
              .select(MEM_ITEM_SELECT)
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
            student.qaida_media_id
              ? supabase.from("media_library").select("*").eq("id", student.qaida_media_id)
              : Promise.resolve({ data: [] as QuranPara[] }),
            // Separate query: before migration_qaida_course.sql the column is missing,
            // and that must not break the student list. An error just means "start".
            supabase.from("students").select("qaida_card_id").eq("id", student.id).maybeSingle(),
          ])
        // A newer selection started while we were loading — discard these results.
        if (seq !== selectSeq.current) return
        setMemItems((memResult.data as unknown as MemItem[]) || [])
        setRounds(roundsResult.data || [])
        setSessions(sessionsResult.data || [])
        setQaidaBook(resolveAssignedQaida(qaidaResult.data || [], student.qaida_media_id))
        setQaidaCardId(
          (cardResult.data as { qaida_card_id?: string | null } | null)?.qaida_card_id ?? null,
        )
      } else {
        setMemItems([])
        setRounds([])
        setSessions([])
        setQaidaBook(null)
        setQaidaCardId(null)
      }
    },
    [students],
  )

  useEffect(() => {
    if (preselected.current || loading) return
    const id = searchParams.get("student")
    if (id && students.some((s) => s.id === id)) {
      preselected.current = true
      void handleSelect(id)
    }
  }, [searchParams, loading, students, handleSelect])

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, name, guardian_name, started_at, class_time, class_days, qaida_media_id")
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

  const { activeRound, para: currentPara } = classPosition(rounds, sessions)
  // A Qaida round teaches the card course on the sentinel para 0; no PDF needed.
  // ponytail: qaidaBook/liveParas stay until phase 5 retires the PDF path.
  const qaidaMissing = false
  const liveParas = qaidaBook
    ? [{ ...qaidaBook, meta: { ...qaidaBook.meta, para_number: QAIDA_PARA } }, ...paras]
    : paras

  // Start class — button morphs to Bismillah, then swaps to live screen
  function handleStartClass() {
    if (starting) return
    setStarting(true)
    // Hold the Bismillah on the button briefly, then transition.
    setTimeout(() => {
      setMode("live")
      setStarting(false)
    }, 1100)
  }

  // End class — save session and return to landing.
  // Returns false on failure so LiveSession can re-enable its Save button.
  async function handleEndSession(data: SessionEndData): Promise<boolean> {
    const sessionInsert: Record<string, unknown> = {
      student_id: selected!.id,
      started_at: data.startedAt.toISOString(),
      ended_at: data.endedAt.toISOString(),
      duration_seconds: data.durationSeconds,
      starting_para: data.startingPara,
      starting_page: data.startingPage,
      ending_para: data.endingPara,
      ending_page: data.endingPage,
      last_page: data.endingPage,
      ending_line: data.endingLine ?? null,
      ending_pointer_x: data.endingPointerX ?? null,
      ending_pointer_y: data.endingPointerY ?? null,
      ending_card_id: data.endingCardId ?? null,
      paras_covered: data.parasCovered,
      memorization_revised: data.memorizationRevised,
      notes: data.notes || null,
    }

    let { error } = await supabase.from("class_sessions").insert(sessionInsert)
    if (error) {
      // Older databases may lack these columns; never lose the session over them.
      delete sessionInsert.starting_page
      delete sessionInsert.ending_line
      delete sessionInsert.ending_pointer_x
      delete sessionInsert.ending_pointer_y
      delete sessionInsert.ending_card_id
      const retry = await supabase.from("class_sessions").insert(sessionInsert)
      error = retry.error
    }

    if (error) {
      console.error("Failed to save class session:", error)
      toast.error(`Failed to save session: ${error.message}`)
      return false
    }

    // Best-effort: a saved class marks the day present. Never fails the save
    // (e.g. class_attendance not migrated yet).
    const { error: attendanceError } = await supabase.from("class_attendance").upsert(
      {
        student_id: selected!.id,
        class_date: pktDateKey(data.startedAt),
        status: "present",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,class_date" },
    )
    if (attendanceError) console.error("Failed to mark attendance:", attendanceError)

    // Qaida course: remember the card so the next class (and the child's
    // Continue) opens there. Best-effort, like attendance.
    if (data.endingCardId) {
      const { error: cardError } = await supabase
        .from("students")
        .update({ qaida_card_id: data.endingCardId })
        .eq("id", selected!.id)
      if (cardError) console.error("Failed to save Qaida card:", cardError)
      else setQaidaCardId(data.endingCardId)
    }

    // Save the exact bookmark position for this para
    // != null, not truthiness: Qaida is para 0. The course has no PDF bookmark.
    if (data.endingPara != null && data.endingPage && !data.endingCardId) {
      // With a bookmark, save it; without one, keep whatever the teacher marked
      // earlier rather than overwriting it with "no bookmark".
      const save =
        typeof data.endingLine === "number"
          ? saveBookmark(selected!.id, data.endingPara, {
              page: data.endingPage,
              line: data.endingLine,
              x: data.endingPointerX,
              y: data.endingPointerY,
            })
          : savePageKeepingBookmark(selected!.id, data.endingPara, data.endingPage)
      await save.catch(() => {})
    }

    // Automatically sync the active Quran round's asc_completed if advanced
    if (activeRound && data.endingPara >= 1 && data.endingPara <= 30) {
      const before = {
        desc: activeRound.desc_completed || 0,
        asc: activeRound.asc_completed || 0,
        completed_at: activeRound.completed_at,
      }
      const newAsc = Math.max(activeRound.asc_completed || 0, data.endingPara)
      if (newAsc !== (activeRound.asc_completed || 0)) {
        await supabase
          .from("quran_rounds")
          .update({ asc_completed: newAsc })
          .eq("id", activeRound.id)
        void syncQuranRoundAchievements(selected!.id, activeRound, before, {
          ...before,
          asc: newAsc,
        })
      }
    }

    setMode("landing")
    toast.success("Class session saved")

    void fetch("/api/notify/session-ended", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: selected!.id,
        duration_minutes: Math.round(data.durationSeconds / 60),
        ending_para: data.endingPara,
      }),
    })

    // Reload sessions and rounds so the landing page updates immediately
    if (selected) {
      const [sessionsRes, roundsRes] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("*")
          .eq("student_id", selected.id)
          .order("started_at", { ascending: false })
          .limit(10),
        supabase
          .from("quran_rounds")
          .select("*")
          .eq("student_id", selected.id)
          .order("round_number", { ascending: true }),
      ])
      setSessions(sessionsRes.data || [])
      setRounds(roundsRes.data || [])
    }

    return true
  }

  // Live session mode
  if (mode === "live" && selected) {
    return (
      <LiveSession
        student={selected}
        rounds={rounds}
        memItems={memItems}
        paras={liveParas}
        initialParaNumber={currentPara}
        initialCardId={qaidaCardId}
        onEnd={handleEndSession}
        onMemItemsChange={setMemItems}
        onRoundsChange={setRounds}
      />
    )
  }

  // Loading
  if (loading) return <PageLoading variant="class-session" />

  // Landing page
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="mb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Class Session</h1>
        <p className="text-sm mt-1.5 text-muted-foreground">
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
            <Link href="/teacher/students/new">
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
              className="inline-flex items-center gap-1 rounded-[10px] px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Change student
            </button>
          </div>
          {selected && (
            <ClassStudentCard
              student={selected}
              rounds={rounds}
              sessions={sessions}
              starting={starting}
              onStart={handleStartClass}
              qaidaMissing={qaidaMissing}
            />
          )}
        </>
      ) : (
        <>
          <ClassTodayAttendance students={students} />
          <ClassStudentPicker
            students={students}
            onlineIds={onlineStudents}
            onSelect={(id) => void handleSelect(id)}
          />
        </>
      )}
    </div>
  )
}
