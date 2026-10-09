"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Pencil,
  Play,
  Plus,
  Tablet,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { FeeDisplay } from "@/components/fee-display"
import {
  loadChunksFor,
  loadMemorizedChunkIds,
  type MemChunk,
  setChunkMemorized,
} from "@/components/memorization-chunks"
import { OnlineDot } from "@/components/online-dot"
import { PageLoading } from "@/components/page-loading"
import { QuranJourney } from "@/components/quran-journey"
import {
  getActiveRound,
  type QuranRound,
} from "@/components/quran-progress"
import { StudentAchievementsPanel } from "@/components/student-achievements-panel"
import { ActivityFeed, type ActivityLog } from "@/components/student-activity-feed"
import { StudentDetailNav, studentNavItems, type StudentView } from "@/components/student-detail-nav"
import { FeeHistoryTable } from "@/components/student-fee-history"
import { StudentForceSignOut } from "@/components/student-force-signout"
import { type HistorySection, StudentOverview } from "@/components/student-overview"
import { StudentPortalAccess } from "@/components/student-portal-access"
import { StudentProfileCard } from "@/components/student-profile-card"
import {
  AddRoundDialog,
  EditRoundDialog,
  type EditRoundForm,
  emptyNewRoundForm,
  type NewRoundForm,
  type RoundProgressForm,
  UpdateProgressDialog,
} from "@/components/student-round-dialogs"
import {
  type ClassSession,
} from "@/components/student-session-bits"
import { StudentSessionsList } from "@/components/student-sessions-list"
import { StudentSignInAccess } from "@/components/student-signin-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { type SortDirection, toggleSort } from "@/components/ui/sortable-header"
import {
  awardMemLesson,
  type RoundProgress,
  syncMemChunkAchievements,
  syncQuranRoundAchievements,
} from "@/lib/achievements"
import { useExchangeRates } from "@/lib/exchange-rates"
import {
  type CatalogItem,
  STUDENT_MEM_SELECT,
  type StudentMemItem,
} from "@/lib/memorization"
import { fetchAllRows, supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useOnlineStudents } from "@/lib/use-online-students"
import {
  cn,
  type FeePayment,
  formatLocalDate,
  parseLocalDate,
  safeFormatDate,
  STATUS_CONFIG,
  type Student,
} from "@/lib/utils"

function roundProgress(
  r: Pick<QuranRound, "desc_completed" | "asc_completed" | "completed_at">,
): RoundProgress {
  return {
    desc: r.desc_completed || 0,
    asc: r.asc_completed || 0,
    completed_at: r.completed_at,
  }
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [fees, setFees] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [feeSortKey, setFeeSortKey] = useState<string | null>(null)
  const [feeSortDir, setFeeSortDir] = useState<SortDirection>(null)
  const [feePage, setFeePage] = useState(1)
  const feePageSize = 12
  const { rates } = useExchangeRates()
  const onlineIds = useOnlineStudents()
  const [memItems, setMemItems] = useState<StudentMemItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [chunksByItem, setChunksByItem] = useState<Record<string, MemChunk[]>>({})
  const [memorizedChunkIds, setMemorizedChunkIds] = useState<Set<string>>(new Set())
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityLoaded, setActivityLoaded] = useState(false)
  const [achievementCount, setAchievementCount] = useState(0)

  const [activeTab, setActiveTab] = useState<StudentView>("profile")
  const [historySection, setHistorySection] = useState<HistorySection>("sessions")

  // Round editing
  const [roundEditOpen, setRoundEditOpen] = useState(false)
  const [roundForm, setRoundForm] = useState<RoundProgressForm>({
    desc_completed: "0",
    asc_completed: "0",
  })
  const [newRoundOpen, setNewRoundOpen] = useState(false)
  const [newRoundForm, setNewRoundForm] = useState<NewRoundForm>(emptyNewRoundForm)
  const [editingRound, setEditingRound] = useState<QuranRound | null>(null)
  const [editRoundForm, setEditRoundForm] = useState<EditRoundForm>({
    started_at: "",
    completed_at: "",
    desc_completed: "0",
    asc_completed: "0",
    is_completed: false,
  })

  async function loadAchievementCount() {
    const { count } = await supabase
      .from("student_achievements")
      .select("id", { count: "exact", head: true })
      .eq("student_id", params.id as string)
    setAchievementCount(count ?? 0)
  }

  const loadStudent = useCallback(async () => {
    const studentAndFeesPromise = (async () => {
      const { data } = await supabase.from("students").select("*").eq("id", params.id).single()
      if (!data) {
        router.push("/students")
        return false
      }
      setStudent(data)
      await ensureFeeRecords(data)
      await loadFees()
      return true
    })()

    const [found] = await Promise.all([
      studentAndFeesPromise,
      loadRounds(),
      loadMemItems(),
      loadCatalog(),
      loadSessions(),
      loadAchievementCount(),
    ])

    if (found) {
      setLoading(false)
    }
    // The loaders above only close over params.id (already a dep) and stable
    // state setters. Adding them to the deps would recreate loadStudent on every
    // render and re-fire the mount effect in a loop, so they're omitted on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router])

  async function loadRounds() {
    const { data } = await supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", params.id)
      .order("started_at", { ascending: true })
    setRounds(data || [])
  }

  async function loadSessions() {
    try {
      // Page past the 1000-row cap so older sessions aren't silently dropped.
      const data = await fetchAllRows<ClassSession>("class_sessions", (q) =>
        q.select("*").eq("student_id", params.id).order("started_at", { ascending: false }),
      )
      setSessions(data)
    } catch {
      setSessions([])
    }
  }

  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    // Most recent 500 interactions — plenty for reviewing a child's session,
    // and capped so a chatty log never floods the page.
    const { data } = await supabase
      .from("activity_logs")
      .select("id, event_type, path, label, href, meta, occurred_at")
      .eq("student_id", params.id)
      .order("occurred_at", { ascending: false })
      .limit(500)
    setActivity((data as ActivityLog[]) || [])
    setActivityLoading(false)
    setActivityLoaded(true)
  }, [params.id])

  async function ensureFeeRecords(s: Student) {
    const startDate = parseLocalDate(s.started_at) ?? new Date()
    const now = new Date()
    const months: { student_id: string; month: number; year: number }[] = []

    // Only generate fees up to the student's last active month. For students who
    // have left, cap at ended_at so we don't create bogus unpaid rows forever.
    let endBoundary = now
    const ended = s.ended_at ? parseLocalDate(s.ended_at) : null
    if (ended && ended < endBoundary) endBoundary = ended

    let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const lastMonth = new Date(endBoundary.getFullYear(), endBoundary.getMonth(), 1)
    while (d <= lastMonth) {
      months.push({
        student_id: s.id,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      })
      d.setMonth(d.getMonth() + 1)
    }

    if (months.length > 0) {
      await supabase.from("fee_payments").upsert(months, {
        onConflict: "student_id,month,year",
        ignoreDuplicates: true,
      })
    }
  }

  async function loadFees() {
    const { data } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", params.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    setFees(data || [])
  }

  async function loadMemItems() {
    const { data } = await supabase
      .from("student_memorization")
      .select(STUDENT_MEM_SELECT)
      .eq("student_id", params.id)
      .order("created_at", { ascending: false })
    const items = (data as unknown as StudentMemItem[]) || []
    setMemItems(items)

    const catalogIds = items.map((m) => m.catalog_id)
    const [chunks, memorizedIds] = await Promise.all([
      loadChunksFor(catalogIds),
      loadMemorizedChunkIds(params.id as string),
    ])
    setChunksByItem(chunks)
    setMemorizedChunkIds(memorizedIds)
  }

  async function toggleChunk(chunk: MemChunk, memorized: boolean) {
    const studentId = params.id as string
    const chunks = chunksByItem[chunk.catalog_id] || []
    const chunkIndex = chunks.findIndex((c) => c.id === chunk.id)
    const lessonTitle =
      memItems.find((m) => m.catalog_id === chunk.catalog_id)?.memorization_catalog?.title ??
      "Lesson"

    // Optimistic: update the local set so the checklist responds instantly.
    setMemorizedChunkIds((prev) => {
      const next = new Set(prev)
      if (memorized) next.add(chunk.id)
      else next.delete(chunk.id)
      return next
    })
    const { error } = await setChunkMemorized(studentId, chunk.id, memorized)
    if (error) {
      toast.error(`Couldn't update part: ${error.message}`)
    } else if (memorized && chunkIndex >= 0) {
      const nextIds = new Set(memorizedChunkIds)
      nextIds.add(chunk.id)
      void syncMemChunkAchievements(
        studentId,
        chunk,
        chunkIndex,
        lessonTitle,
        chunks,
        nextIds,
      )
    }
    // Reload so the DB-derived item status (memorizing ↔ memorized) is reflected.
    await loadMemItems()
  }

  async function loadCatalog() {
    const { data } = await supabase
      .from("memorization_catalog")
      .select("*")
      .order("category")
      .order("title")
    setCatalog(data || [])
  }

  async function assignItem(catalogId: string) {
    await supabase.from("student_memorization").upsert(
      {
        student_id: params.id,
        catalog_id: catalogId,
        status: "memorizing",
      },
      { onConflict: "student_id,catalog_id" },
    )
    await loadMemItems()
  }

  async function unassignItem(id: string) {
    await supabase.from("student_memorization").delete().eq("id", id)
    await loadMemItems()
  }

  async function toggleMemStatus(item: StudentMemItem) {
    const newStatus = item.status === "memorizing" ? "memorized" : "memorizing"
    await supabase
      .from("student_memorization")
      .update({
        status: newStatus,
        last_revised_at: null,
        revision_assigned_at: null,
      })
      .eq("id", item.id)
    if (newStatus === "memorized") {
      void awardMemLesson(
        params.id as string,
        item.catalog_id,
        item.memorization_catalog.title,
      )
    }
    await loadMemItems()
  }

  async function assignRevision(id: string) {
    const { error } = await supabase
      .from("student_memorization")
      .update({ revision_assigned_at: new Date().toISOString() })
      .eq("id", id)
    if (error) {
      toast.error("Couldn't assign revision")
      return
    }
    toast.success("Assigned for revision")
    await loadMemItems()
  }

  async function markRevised(id: string) {
    const { error } = await supabase
      .from("student_memorization")
      .update({
        revision_assigned_at: null,
        last_revised_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) {
      toast.error("Couldn't record revision")
      return
    }
    await loadMemItems()
  }

  async function toggleFee(fee: FeePayment) {
    const newPaid = !fee.is_paid
    const paidAt = newPaid ? new Date().toISOString() : null

    setFees((prev) =>
      prev.map((f) => (f.id === fee.id ? { ...f, is_paid: newPaid, paid_at: paidAt } : f)),
    )

    const { error } = await supabase
      .from("fee_payments")
      .update({ is_paid: newPaid, paid_at: paidAt })
      .eq("id", fee.id)

    if (error) {
      // Roll back so the money screen doesn't diverge from the DB.
      setFees((prev) =>
        prev.map((f) =>
          f.id === fee.id ? { ...f, is_paid: fee.is_paid, paid_at: fee.paid_at } : f,
        ),
      )
      toast.error(`Couldn't update payment: ${error.message}`)
      return
    }

    if (newPaid) {
      void fetch("/api/notify/fee-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: fee.student_id, month: fee.month, year: fee.year }),
      })
    }
  }

  // Round management
  async function completeActiveRound() {
    const active = getActiveRound(rounds)
    if (!active) return
    const before = roundProgress(active)
    const completedAt = formatLocalDate()
    const total = before.desc + (before.asc > 0 ? before.asc - 1 : 0)
    const desc = total >= 30 ? 30 : before.desc
    const asc = total >= 30 ? 0 : before.asc
    await supabase
      .from("quran_rounds")
      .update({ completed_at: completedAt, desc_completed: desc, asc_completed: asc })
      .eq("id", active.id)
    void syncQuranRoundAchievements(params.id as string, active, before, {
      desc,
      asc,
      completed_at: completedAt,
    })
    await loadRounds()
    toast.success("Round marked as completed")
  }

  async function saveRoundProgress() {
    const active = getActiveRound(rounds)
    if (!active) return

    const before = roundProgress(active)
    const desc = parseInt(roundForm.desc_completed) || 0
    const asc = parseInt(roundForm.asc_completed) || 0
    await supabase
      .from("quran_rounds")
      .update({
        desc_completed: desc,
        asc_completed: asc,
      })
      .eq("id", active.id)

    void syncQuranRoundAchievements(params.id as string, active, before, {
      desc,
      asc,
      completed_at: before.completed_at,
    })

    setRoundEditOpen(false)
    await loadRounds()
    void loadAchievementCount()
  }

  async function stepRoundProgress(deltaAsc: number, deltaDesc: number) {
    const active = getActiveRound(rounds)
    if (!active || active.type !== "quran") return

    const before = roundProgress(active)
    const nextAsc = Math.max(0, Math.min(30, (active.asc_completed || 0) + deltaAsc))
    const nextDesc = Math.max(0, Math.min(30, (active.desc_completed || 0) + deltaDesc))
    if (nextAsc === (active.asc_completed || 0) && nextDesc === (active.desc_completed || 0)) {
      return
    }

    // Optimistic update for instant feedback
    setRounds((prev) =>
      prev.map((r) =>
        r.id === active.id ? { ...r, asc_completed: nextAsc, desc_completed: nextDesc } : r,
      ),
    )

    const { error } = await supabase
      .from("quran_rounds")
      .update({
        asc_completed: nextAsc,
        desc_completed: nextDesc,
      })
      .eq("id", active.id)

    if (error) {
      toast.error(error.message)
      await loadRounds()
      return
    }

    void syncQuranRoundAchievements(params.id as string, active, before, {
      desc: nextDesc,
      asc: nextAsc,
      completed_at: before.completed_at,
    })
    void loadAchievementCount()
  }

  async function startNewRound() {
    // Determine round number
    const existingOfType = rounds.filter((r) => r.type === newRoundForm.type)
    const nextNum =
      existingOfType.length > 0 ? Math.max(...existingOfType.map((r) => r.round_number)) + 1 : 1

    // A completed round = all 30 paras done. Progress is computed as
    // desc + max(asc - 1, 0), so a finished round is desc=30, asc=0 (=> 30/30).
    // Using asc=30 would wrongly compute 30 + 29 = 59/30.
    const desc = newRoundForm.is_completed ? 30 : parseInt(newRoundForm.desc_completed) || 0
    const asc = newRoundForm.is_completed ? 0 : parseInt(newRoundForm.asc_completed) || 0

    // Starting a new in-progress round closes out the current active one, so a
    // student never ends up with two open rounds (which made Update/Complete
    // ambiguous). Logging a past completed round leaves the active round alone.
    if (!newRoundForm.is_completed) {
      const active = getActiveRound(rounds)
      if (active) {
        const before = roundProgress(active)
        const closedAt = newRoundForm.started_at || formatLocalDate()
        const { error: closeError } = await supabase
          .from("quran_rounds")
          .update({ completed_at: closedAt })
          .eq("id", active.id)
        if (closeError) {
          toast.error(closeError.message)
          return
        }
        void syncQuranRoundAchievements(params.id as string, active, before, {
          ...before,
          completed_at: closedAt,
        })
      }
    }

    const completedAt = newRoundForm.is_completed
      ? newRoundForm.completed_at || formatLocalDate()
      : null

    const { data: inserted, error } = await supabase
      .from("quran_rounds")
      .insert({
        student_id: params.id,
        type: newRoundForm.type,
        round_number: nextNum,
        started_at: newRoundForm.started_at,
        completed_at: completedAt,
        desc_completed: desc,
        asc_completed: asc,
      })
      .select("id")
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    if (inserted?.id && (desc > 0 || asc > 0 || completedAt)) {
      void syncQuranRoundAchievements(
        params.id as string,
        { id: inserted.id, type: newRoundForm.type, round_number: nextNum },
        { desc: 0, asc: 0, completed_at: null },
        { desc, asc, completed_at: completedAt },
      )
    }

    setNewRoundOpen(false)
    setNewRoundForm(emptyNewRoundForm())
    await loadRounds()
    void loadAchievementCount()
  }

  function openEditRound(r: QuranRound) {
    setEditingRound(r)
    setEditRoundForm({
      started_at: (r.started_at || "").split("T")[0],
      completed_at: r.completed_at ? r.completed_at.split("T")[0] : "",
      desc_completed: (r.desc_completed || 0).toString(),
      asc_completed: (r.asc_completed || 0).toString(),
      is_completed: !!r.completed_at,
    })
  }

  async function saveEditRound() {
    if (!editingRound) return

    const nextStartedAt = editRoundForm.started_at || editingRound.started_at

    if (!editRoundForm.is_completed) {
      const hasOtherActive = rounds.some((r) => r.id !== editingRound.id && !r.completed_at)
      if (hasOtherActive) {
        toast.error("Cannot mark this round as incomplete while another round is already active.")
        return
      }
      const hasSubsequentRound = rounds.some(
        (r) =>
          r.id !== editingRound.id &&
          ((r.started_at || "").localeCompare(nextStartedAt || "") > 0 ||
            (r.started_at === nextStartedAt && r.round_number > editingRound.round_number)),
      )
      if (hasSubsequentRound) {
        toast.error("Cannot reopen an older round when a newer round has already started.")
        return
      }
    }

    // Completed round => desc=30, asc=0 (=> 30/30). See note in startNewRound.
    const before = roundProgress(editingRound)
    const desc = editRoundForm.is_completed ? 30 : parseInt(editRoundForm.desc_completed) || 0
    const asc = editRoundForm.is_completed ? 0 : parseInt(editRoundForm.asc_completed) || 0
    const completedAt = editRoundForm.is_completed
      ? editRoundForm.completed_at || formatLocalDate()
      : null

    const { error } = await supabase
      .from("quran_rounds")
      .update({
        started_at: nextStartedAt,
        completed_at: completedAt,
        desc_completed: desc,
        asc_completed: asc,
      })
      .eq("id", editingRound.id)

    if (error) {
      toast.error(error.message)
      return
    }

    void syncQuranRoundAchievements(params.id as string, editingRound, before, {
      desc,
      asc,
      completed_at: completedAt,
    })

    setEditingRound(null)
    await loadRounds()
    void loadAchievementCount()
  }

  async function deleteRound(roundId: string) {
    await supabase.from("quran_rounds").delete().eq("id", roundId)
    await loadRounds()
    toast.success("Round deleted")
  }

  function handleNavigate(view: StudentView, section?: HistorySection) {
    setActiveTab(view)
    if (section) {
      setHistorySection(section)
    }
  }

  useEffect(() => {
    loadStudent()
  }, [loadStudent])

  // Lazy-load activity when entering the sessions tab
  useEffect(() => {
    if (activeTab === "sessions" && !activityLoaded && !activityLoading) {
      loadActivity()
    }
  }, [activeTab, activityLoaded, activityLoading, loadActivity])

  if (loading || !student) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageLoading variant="detail" />
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading
  const activeRound = getActiveRound(rounds)
  const paidCount = fees.filter((f) => f.is_paid).length
  const unpaidCount = fees.filter((f) => !f.is_paid).length
  const now = new Date()
  const currentFee = fees.find(
    (f) => f.month === now.getMonth() + 1 && f.year === now.getFullYear(),
  )
  const currentMonthUnpaid = Boolean(currentFee && !currentFee.is_paid)
  const isOnline = onlineIds.has(student.id)

  const navItems = studentNavItems({
    sessionCount: sessions.length,
    unpaidThisMonth: currentMonthUnpaid,
    achievementCount,
  })

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Link href="/" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <Link href="/students" className="hover:text-foreground transition-colors">
          Students
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium truncate max-w-[150px]">{student.name}</span>
      </nav>

      {/* Clean Command Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/students">
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight truncate leading-none">
              {student.name}
            </h1>
            <Badge variant={statusCfg.variant} className="flex-shrink-0">
              {statusCfg.label}
            </Badge>
            {isOnline && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                <OnlineDot />
                Online
              </span>
            )}
            {student.last_device && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                title={
                  student.last_device_at
                    ? `Last active on this device: ${safeFormatDate(student.last_device_at, "PPp")}`
                    : undefined
                }
              >
                <Tablet className="h-3 w-3 text-primary" />
                {student.last_device}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/class?student=${student.id}`}>
            <Button size="sm">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start class
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Underline Navigation */}
      <StudentDetailNav active={activeTab} onChange={setActiveTab} items={navItems} />

      {/* Full-width Workspace */}
      <div className="min-w-0">
        {activeTab === "profile" && (
          <div className="animate-fade-in-up grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: Student Profile & Schedule Settings */}
            <StudentProfileCard
              student={student}
              currentFee={currentFee}
              onToggleFee={(fee) => void toggleFee(fee)}
              onOpenBilling={() => setActiveTab("account")}
              onSaved={() => void loadStudent()}
            />

            {/* Right Column: Portal Access & Security */}
            <div className="lg:col-span-5 space-y-4">
              <StudentPortalAccess studentId={student.id} />
              <StudentSignInAccess studentId={student.id} />
              <StudentForceSignOut studentId={student.id} />
            </div>
          </div>
        )}
        {activeTab === "overview" && (
          <StudentOverview
            student={student}
            rounds={rounds}
            sessions={sessions}
            memItems={memItems}
            catalog={catalog}
            chunksByItem={chunksByItem}
            memorizedChunkIds={memorizedChunkIds}
            onNavigate={handleNavigate}
            onUpdateProgress={() => {
              if (!activeRound) return
              setRoundForm({
                desc_completed: (activeRound.desc_completed || 0).toString(),
                asc_completed: (activeRound.asc_completed || 0).toString(),
              })
              setRoundEditOpen(true)
            }}
            onStepRoundProgress={(deltaAsc, deltaDesc) => void stepRoundProgress(deltaAsc, deltaDesc)}
            onCompleteRound={() => void completeActiveRound()}
            onOpenNewRound={() => setNewRoundOpen(true)}
            onLoadCatalog={() => void loadCatalog()}
            onAssignMemItem={(catalogId) => void assignItem(catalogId)}
            onUnassignMemItem={(id) => void unassignItem(id)}
            onToggleMemStatus={(item) => void toggleMemStatus(item)}
            onToggleChunk={(chunk, memorized) => void toggleChunk(chunk, memorized)}
            onAssignMemRevision={(id) => void assignRevision(id)}
            onMarkMemRevised={(id) => void markRevised(id)}
            onAchievementEarned={() => void loadAchievementCount()}
          />
        )}

        {activeTab === "sessions" && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Sub-filter pill bar for Sessions, Timeline & Portal Activity */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  {
                    id: "sessions",
                    label: `Class Sessions (${sessions.length})`,
                    icon: Clock,
                  },
                  {
                    id: "timeline",
                    label: `Quran Timeline (${rounds.length})`,
                    icon: BookOpen,
                  },
                  {
                    id: "activity",
                    label: `Portal Activity (${activity.length})`,
                    icon: Activity,
                  },
                ] as const
              ).map((pill) => {
                const PillIcon = pill.icon
                const isSelected = historySection === pill.id
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setHistorySection(pill.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-semibold"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <PillIcon className="h-3.5 w-3.5" />
                    {pill.label}
                  </button>
                )
              })}
            </div>

            {/* 1. CLASS SESSIONS SECTION */}
            {(historySection === "all" || historySection === "sessions") && (
              <StudentSessionsList
                studentId={student.id}
                studentName={student.name}
                sessions={sessions}
                onSessionsChange={setSessions}
                onReload={loadSessions}
              />
            )}

            {/* 2. QURAN TIMELINE SECTION */}
            {(historySection === "all" || historySection === "timeline") && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">Quran & Qaida Journey</h2>
                    <p className="text-sm text-muted-foreground">
                      Completed rounds, active para map, and historical milestones
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeRound && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoundForm({
                              desc_completed: (activeRound.desc_completed || 0).toString(),
                              asc_completed: (activeRound.asc_completed || 0).toString(),
                            })
                            setRoundEditOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Update Progress
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={completeActiveRound}
                          className="text-emerald-600 hover:text-emerald-500"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    <Button size="sm" onClick={() => setNewRoundOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Round
                    </Button>
                  </div>
                </div>

                <QuranJourney
                  rounds={rounds}
                  onEditRound={openEditRound}
                  onDeleteRound={deleteRound}
                />
              </div>
            )}

            {/* 3. PORTAL ACTIVITY SECTION */}
            {(historySection === "all" || historySection === "activity") && (
              <Card>
                <div className="px-5 py-4 border-b border-border/50">
                  <h2 className="text-base font-semibold">Portal Activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.length > 0
                      ? `${activity.length} events logged from the student app`
                      : "Clicks and page views from the student app"}
                  </p>
                </div>
                <CardContent className="pt-4 pb-5">
                  <ActivityFeed logs={activity.slice(0, 50)} loading={activityLoading} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "trophies" && (
          <div className="animate-fade-in-up">
            <StudentAchievementsPanel
              studentId={student.id}
              onUpdated={() => void loadAchievementCount()}
            />
          </div>
        )}

        {activeTab === "account" && (
          <div className="animate-fade-in-up grid gap-6 lg:grid-cols-12">
            {/* Left Column: Billing & Fee Ledger */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Billing & Fee Ledger</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Monthly fees and payment history
                </p>
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-semibold">{paidCount}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">Unpaid</span>
                    <span className="font-semibold">{unpaidCount}</span>
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <FeeDisplay
                    amount={student.fee}
                    currency={student.fee_currency}
                    rates={rates}
                    size="sm"
                  />
                  <span className="text-muted-foreground text-xs">/ month</span>
                </div>
                <FeeHistoryTable
                  fees={fees}
                  sortKey={feeSortKey}
                  sortDir={feeSortDir}
                  page={feePage}
                  pageSize={feePageSize}
                  onSort={(key) => {
                    const result = toggleSort(feeSortKey, feeSortDir, key)
                    setFeeSortKey(result.direction ? result.key : null)
                    setFeeSortDir(result.direction)
                    setFeePage(1)
                  }}
                  onPageChange={setFeePage}
                  onToggleFee={toggleFee}
                />
              </div>
            </div>

            {/* Right Column: Portal Access & Security */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Portal Access & Security</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Student login credentials, sign-in permissions, and active sessions
                </p>
                <div className="space-y-4">
                  <StudentPortalAccess studentId={student.id} />
                  <StudentSignInAccess studentId={student.id} />
                  <StudentForceSignOut studentId={student.id} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <UpdateProgressDialog
        open={roundEditOpen}
        onOpenChange={setRoundEditOpen}
        round={activeRound}
        rounds={rounds}
        form={roundForm}
        onFormChange={setRoundForm}
        onSave={() => void saveRoundProgress()}
      />
      <AddRoundDialog
        open={newRoundOpen}
        onOpenChange={setNewRoundOpen}
        form={newRoundForm}
        onFormChange={setNewRoundForm}
        onSave={() => void startNewRound()}
      />
      <EditRoundDialog
        round={editingRound}
        rounds={rounds}
        onClose={() => setEditingRound(null)}
        form={editRoundForm}
        onFormChange={setEditRoundForm}
        onSave={() => void saveEditRound()}
      />
    </div>
  )
}
