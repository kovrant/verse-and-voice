"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import * as Popover from "@radix-ui/react-popover"
import { differenceInDays, format, formatDistanceToNow, subMonths } from "date-fns"
import {
  Activity,
  ArrowLeft,
  BookMarked,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  FileText,
  History,
  KeyRound,
  MapPin,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { ClassDaysPicker } from "@/components/class-days-picker"
import { FeeDisplay } from "@/components/fee-display"
import {
  loadChunksFor,
  loadMemorizedChunkIds,
  type MemChunk,
  MemPartWorkspace,
  setChunkMemorized,
} from "@/components/memorization-chunks"
import { QuranJourney } from "@/components/quran-journey"
import {
  getActiveRound,
  getChronologicalRoundNumber,
  QuranProgress,
  type QuranRound,
} from "@/components/quran-progress"
import { ActivityFeed, type ActivityLog } from "@/components/student-activity-feed"
import { FeeHistoryTable } from "@/components/student-fee-history"
import { StudentForceSignOut } from "@/components/student-force-signout"
import { StudentNamazAssign } from "@/components/student-namaz-assign"
import { StudentPortalAccess } from "@/components/student-portal-access"
import { PageLoading } from "@/components/page-loading"
import { StudentQaidaAssign } from "@/components/student-qaida-assign"
import {
  type ClassSession,
  MemThumb,
  paraSummary,
  SessionStat,
} from "@/components/student-session-bits"
import { StudentSignInAccess } from "@/components/student-signin-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type SortDirection, toggleSort } from "@/components/ui/sortable-header"
import { toInputTime, toPktClassTime } from "@/lib/class-time"
import { useExchangeRates } from "@/lib/exchange-rates"
import {
  type CatalogItem,
  chunkProgress,
  STUDENT_MEM_SELECT,
  type StudentMemItem,
} from "@/lib/memorization"
import { awardMemLesson, syncMemChunkAchievements } from "@/lib/mem-achievements"
import { syncQuranRoundAchievements, type RoundProgress } from "@/lib/quran-achievements"
import { fetchAllRows, supabase } from "@/lib/supabase"
import {
  COUNTRIES,
  type FeePayment,
  formatLocalDate,
  formatSessionDuration,
  parseLocalDate,
  STATUS_CONFIG,
  type Student,
  type StudentStatus,
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
  const [editOpen, setEditOpen] = useState(false)
  const [feeSortKey, setFeeSortKey] = useState<string | null>(null)
  const [feeSortDir, setFeeSortDir] = useState<SortDirection>(null)
  const [feePage, setFeePage] = useState(1)
  const feePageSize = 12
  const { rates } = useExchangeRates()
  const [memItems, setMemItems] = useState<StudentMemItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [chunksByItem, setChunksByItem] = useState<Record<string, MemChunk[]>>({})
  const [memorizedChunkIds, setMemorizedChunkIds] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState(false)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null)
  const [deletingSession, setDeletingSession] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleaningOld, setCleaningOld] = useState(false)
  const [sessionPage, setSessionPage] = useState(1)
  const SESSION_PAGE_SIZE = 10
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityLoaded, setActivityLoaded] = useState(false)

  // Edit form (non-quran fields)
  const [editForm, setEditForm] = useState({
    fee: "",
    fee_currency: "GBP",
    class_time: "",
    class_days: [] as number[],
    country: "",
    status: "Reading" as StudentStatus,
    ended_at: "",
  })

  const [activeTab, setActiveTab] = useState<
    "journey" | "sessions" | "memorization" | "fees" | "activity" | "portal"
  >("journey")

  // Round editing
  const [roundEditOpen, setRoundEditOpen] = useState(false)
  const [roundForm, setRoundForm] = useState({
    desc_completed: "0",
    asc_completed: "0",
  })
  const [newRoundOpen, setNewRoundOpen] = useState(false)
  const [newRoundForm, setNewRoundForm] = useState({
    type: "quran" as "qaida" | "quran",
    started_at: formatLocalDate(),
    completed_at: "",
    desc_completed: "0",
    asc_completed: "0",
    is_completed: false,
  })
  const [editingRound, setEditingRound] = useState<QuranRound | null>(null)
  const [editRoundForm, setEditRoundForm] = useState({
    started_at: "",
    completed_at: "",
    desc_completed: "0",
    asc_completed: "0",
    is_completed: false,
  })

  const loadStudent = useCallback(async () => {
    const { data } = await supabase.from("students").select("*").eq("id", params.id).single()

    if (!data) {
      router.push("/students")
      return
    }

    setStudent(data)
    setEditForm({
      fee: data.fee.toString(),
      fee_currency: data.fee_currency,
      class_time: data.class_time || "",
      class_days: Array.isArray(data.class_days) ? data.class_days : [],
      country: data.country || "",
      status: data.status || "Reading",
      ended_at: data.ended_at || "",
    })

    await ensureFeeRecords(data)
    await Promise.all([loadRounds(), loadFees(), loadMemItems(), loadCatalog(), loadSessions()])
    setLoading(false)
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
    // Page past the 1000-row cap so older sessions aren't silently dropped.
    const data = await fetchAllRows<ClassSession>("class_sessions", (q) =>
      q.select("*").eq("student_id", params.id).order("started_at", { ascending: false }),
    )
    setSessions(data)
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
    // Query pulls the 500 most-recent events (desc + limit); reverse so the feed
    // reads chronologically — oldest at the top, newest at the bottom.
    setActivity(((data as ActivityLog[]) || []).reverse())
    setActivityLoading(false)
    setActivityLoaded(true)
  }, [params.id])

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
    setSessions(remaining)
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
      .eq("student_id", params.id)
      .lt("started_at", cutoff.toISOString())
    setCleaningOld(false)
    if (error) {
      toast.error(`Failed to clean up sessions: ${error.message}`)
      return
    }
    setCleanupOpen(false)
    await loadSessions()
    setSessionPage(1)
    toast.success("Removed sessions older than 1 month")
  }

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
    const items = ((data as any) || []) as StudentMemItem[]
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
        last_revised_at: newStatus === "memorized" ? new Date().toISOString() : null,
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

  async function markRevised(id: string) {
    await supabase
      .from("student_memorization")
      .update({ last_revised_at: new Date().toISOString() })
      .eq("id", id)
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

  async function saveEdit() {
    // Guard against an empty fee becoming NaN (NOT NULL violation): keep the
    // existing fee if the field was cleared/invalid.
    const parsedFee = parseFloat(editForm.fee)
    const fee = Number.isNaN(parsedFee) ? (student?.fee ?? 0) : parsedFee

    const { error } = await supabase
      .from("students")
      .update({
        fee,
        fee_currency: editForm.fee_currency,
        class_time: editForm.class_time || null,
        class_days: editForm.class_days.length > 0 ? editForm.class_days : null,
        country: editForm.country || null,
        status: editForm.status,
        // "Reading" students have no end date — clear any stale value left over
        // from a previous "Completed"/"Left" status.
        ended_at: editForm.status === "Reading" ? null : editForm.ended_at || null,
      })
      .eq("id", params.id)

    if (error) {
      toast.error(`Couldn't save changes: ${error.message}`)
      return
    }

    setEditOpen(false)
    loadStudent()
  }

  // Round management
  async function completeActiveRound() {
    const active = getActiveRound(rounds)
    if (!active) return
    const before = roundProgress(active)
    const completedAt = formatLocalDate()
    await supabase.from("quran_rounds").update({ completed_at: completedAt }).eq("id", active.id)
    void syncQuranRoundAchievements(params.id as string, active, before, {
      ...before,
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
    setNewRoundForm({
      type: "quran",
      started_at: formatLocalDate(),
      completed_at: "",
      desc_completed: "0",
      asc_completed: "0",
      is_completed: false,
    })
    await loadRounds()
  }

  function openEditRound(r: QuranRound) {
    setEditingRound(r)
    setEditRoundForm({
      started_at: r.started_at.split("T")[0],
      completed_at: r.completed_at ? r.completed_at.split("T")[0] : "",
      desc_completed: (r.desc_completed || 0).toString(),
      asc_completed: (r.asc_completed || 0).toString(),
      is_completed: !!r.completed_at,
    })
  }

  async function saveEditRound() {
    if (!editingRound) return

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
        started_at: editRoundForm.started_at,
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
  }

  async function deleteRound(roundId: string) {
    await supabase.from("quran_rounds").delete().eq("id", roundId)
    await loadRounds()
    toast.success("Round deleted")
  }

  useEffect(() => {
    loadStudent()
  }, [loadStudent])

  // Reset Sessions pagination when entering the tab
  useEffect(() => {
    if (activeTab === "sessions") setSessionPage(1)
  }, [activeTab])

  // Lazy-load the activity feed the first time the tab is opened.
  useEffect(() => {
    if (activeTab === "activity" && !activityLoaded && !activityLoading) {
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

  const daysSinceStart = differenceInDays(
    new Date(),
    parseLocalDate(student.started_at) ?? new Date(),
  )
  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading
  const activeRound = getActiveRound(rounds)
  const paidCount = fees.filter((f) => f.is_paid).length
  const unpaidCount = fees.filter((f) => !f.is_paid).length
  const memorizingCount = memItems.filter((m) => m.status === "memorizing").length
  const memorizedCount = memItems.filter((m) => m.status === "memorized").length

  const TABS = [
    { id: "journey" as const, label: "Quran Journey", icon: BookOpen },
    { id: "sessions" as const, label: "Sessions", icon: History, count: sessions.length },
    {
      id: "memorization" as const,
      label: "Memorization",
      icon: BookMarked,
      count: memorizingCount + memorizedCount,
    },
    { id: "fees" as const, label: "Fees", icon: CreditCard, count: unpaidCount },
    { id: "activity" as const, label: "Activity", icon: Activity },
    { id: "portal" as const, label: "Portal Access", icon: KeyRound },
  ]

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
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/students">
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xl font-bold flex-shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-3xl font-bold tracking-tight truncate leading-none">
              {student.name}
            </h1>
            <Badge variant={statusCfg.variant} className="flex-shrink-0">
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground mt-1.5">
            <span>{student.guardian_name}</span>
            {student.country && (
              <>
                <span className="text-muted-foreground/40">&middot;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {student.country}
                </span>
              </>
            )}
            <span className="text-muted-foreground/40">&middot;</span>
            <span>{daysSinceStart} days enrolled</span>
            {student.ended_at && (
              <>
                <span className="text-muted-foreground/40">&middot;</span>
                <span>
                  Ended {format(parseLocalDate(student.ended_at) ?? new Date(), "MMM yyyy")}
                </span>
              </>
            )}
          </div>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit — {student.name}</DialogTitle>
              <DialogDescription>
                Update details for {student.name} ({student.guardian_name})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={editForm.country}
                    onValueChange={(val) => setEditForm({ ...editForm, country: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_class_time">Class Time (PKT)</Label>
                  <Input
                    id="edit_class_time"
                    type="time"
                    value={toInputTime(editForm.class_time)}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        class_time: e.target.value ? toPktClassTime(e.target.value) : "",
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class Days</Label>
                <ClassDaysPicker
                  value={editForm.class_days}
                  onChange={(class_days) => setEditForm({ ...editForm, class_days })}
                />
                <p className="text-xs text-muted-foreground">
                  Days this student has class — drives their daily streak.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Monthly Fee</Label>
                  <Input
                    type="number"
                    value={editForm.fee}
                    onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={editForm.fee_currency}
                    onValueChange={(val) => setEditForm({ ...editForm, fee_currency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="PKR">PKR (Rs)</SelectItem>
                      <SelectItem value="SAR">SAR (﷼)</SelectItem>
                      <SelectItem value="BHD">BHD (BD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) =>
                      setEditForm({ ...editForm, status: val as StudentStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reading">Reading</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Left Uncompleted">Left Uncompleted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.status !== "Reading" && (
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={editForm.ended_at}
                      onChange={(e) => setEditForm({ ...editForm, ended_at: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat bar — one segmented card */}
      <div className="mb-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card sm:flex-row">
        <div className="flex flex-1 items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <FeeDisplay
              amount={student.fee}
              currency={student.fee_currency}
              rates={rates}
              size="sm"
            />
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              <QuranProgress rounds={rounds} variant="compact" />
            </div>
            <p className="text-[11px] text-muted-foreground">Progress</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {student.class_time || "No time set"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {student.class_days && student.class_days.length > 0
                ? student.class_days
                    .slice()
                    .sort((a, b) => a - b)
                    .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                    .join(" · ")
                : "No days set"}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              <span className="tabular-nums">{daysSinceStart}</span> days
            </p>
            <p className="text-[11px] text-muted-foreground">Enrolled</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation — connected segmented control; active segment is raised */}
      <div className="mb-6 overflow-x-auto pb-1 -mb-1 sm:mb-6">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-secondary/60 p-1.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-card font-semibold text-foreground shadow-soft"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon
                  className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-emerald-600" : ""}`}
                />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "journey" && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end">
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
                  className="text-emerald-400 hover:text-emerald-300"
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

          {/* Hero progress + journey stats + timeline */}
          <QuranJourney rounds={rounds} onEditRound={openEditRound} onDeleteRound={deleteRound} />
        </div>
      )}

      {activeTab === "sessions" &&
        (() => {
          const totalSessions = sessions.length
          const totalSessionPages = Math.max(1, Math.ceil(totalSessions / SESSION_PAGE_SIZE))
          const startIdx = (sessionPage - 1) * SESSION_PAGE_SIZE
          const paginatedSessions = sessions.slice(startIdx, startIdx + SESSION_PAGE_SIZE)
          const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
          const now = new Date()
          const thisMonthCount = sessions.filter((s) => {
            const d = new Date(s.started_at)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length
          const lastSession = sessions[0]
          const cleanupCutoff = subMonths(now, 1)
          const oldSessionsCount = sessions.filter(
            (s) => new Date(s.started_at) < cleanupCutoff,
          ).length
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
            <div className="animate-fade-in-up space-y-5">
              {totalSessions === 0 ? (
                <div className="py-16 text-center bg-card rounded-2xl border border-border">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">No sessions yet</p>
                  <p className="text-sm text-muted-foreground">
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
                      value={lastSession ? format(new Date(lastSession.started_at), "MMM d") : "--"}
                      label="Last class"
                    />
                  </div>

                  {/* Cleanup toolbar — only when there are sessions older than 1 month */}
                  {oldSessionsCount > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{oldSessionsCount}</span>{" "}
                        session{oldSessionsCount === 1 ? "" : "s"} older than 1 month
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
                              This removes every session older than 1 month for {student.name}. Only
                              the last month is kept. This can&rsquo;t be undone.
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
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/30 px-5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {totalSessions} {totalSessions === 1 ? "Session" : "Sessions"}
                      </p>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Newest first ↓
                      </span>
                    </div>

                    <div className="max-h-[620px] overflow-y-auto main-scroll">
                      {paginatedSessions.map((session, i) => {
                        const paras = paraSummary(session)
                        const revised = session.memorization_revised?.length || 0
                        const started = new Date(session.started_at)
                        return (
                          <div
                            key={session.id}
                            className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 ${
                              i < paginatedSessions.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            {/* Date block */}
                            <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-secondary/40">
                              <span className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">
                                {format(started, "MMM")}
                              </span>
                              <span className="font-heading text-lg font-bold leading-tight tabular-nums text-foreground">
                                {format(started, "d")}
                              </span>
                            </div>

                            {/* Main */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <p className="text-sm font-semibold text-foreground">
                                  {format(started, "EEEE")}
                                </p>
                                <span className="text-muted-foreground/40">&middot;</span>
                                <span className="text-[13px] text-muted-foreground">
                                  {format(started, "MMM d, yyyy")}
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

                            {/* Right — relative time + delete */}
                            <div className="flex flex-shrink-0 items-center gap-1.5">
                              <span className="hidden text-[11px] text-muted-foreground sm:block">
                                {formatDistanceToNow(started, { addSuffix: true })}
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

                  {/* Pagination — only when more than one page */}
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
        })()}

      {activeTab === "memorization" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssignOpen(!assignOpen)
                if (!assignOpen) loadCatalog()
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Assign
            </Button>
          </div>

          {assignOpen && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assign from Catalog
              </p>
              <div className="flex flex-wrap gap-2">
                {catalog
                  .filter((c) => !memItems.some((m) => m.catalog_id === c.id))
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => assignItem(item.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      {item.title}
                      <span className="text-muted-foreground/40">({item.category})</span>
                    </button>
                  ))}
                {catalog.filter((c) => !memItems.some((m) => m.catalog_id === c.id)).length ===
                  0 && <p className="text-xs text-muted-foreground">All items assigned.</p>}
              </div>
            </div>
          )}

          {memorizingCount > 0 && (
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-600">
                <Sparkles className="h-3.5 w-3.5" />
                Currently Memorizing ({memorizingCount})
              </p>
              {memItems
                .filter((m) => m.status === "memorizing")
                .map((item) => {
                  const chunks = chunksByItem[item.catalog_id] || []
                  const hasChunks = chunks.length > 0
                  const progress = chunkProgress(chunks, memorizedChunkIds)
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-green-500/25 bg-card shadow-soft"
                    >
                      <div className="flex items-center gap-3.5 border-b border-green-500/10 bg-gradient-to-r from-green-400/[0.10] to-transparent p-3">
                        <MemThumb src={item.memorization_catalog?.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.memorization_catalog?.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                              <Sparkles className="h-2.5 w-2.5" />
                              In progress
                            </span>
                            {hasChunks && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                {progress.done}/{progress.total} parts
                              </span>
                            )}
                            {item.memorization_catalog?.category && (
                              <span className="text-[11px] text-muted-foreground">
                                {item.memorization_catalog.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          {!hasChunks && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleMemStatus(item)}
                              className="h-8 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Mark done
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => unassignItem(item.id)}
                            aria-label="Remove item"
                            title="Remove item"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {hasChunks && (
                        <div className="p-3">
                          <MemPartWorkspace
                            chunks={chunks}
                            memorizedIds={memorizedChunkIds}
                            onToggle={toggleChunk}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {memorizedCount > 0 && (
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Memorized ({memorizedCount})
              </p>
              {memItems
                .filter((m) => m.status === "memorized")
                .map((item) => {
                  const chunks = chunksByItem[item.catalog_id] || []
                  const hasChunks = chunks.length > 0
                  const progress = chunkProgress(chunks, memorizedChunkIds)
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                    >
                      <div className="flex items-center gap-3.5 border-b border-border/50 p-3">
                        <MemThumb src={item.memorization_catalog?.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.memorization_catalog?.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                              <Check className="h-2.5 w-2.5" />
                              Memorized
                            </span>
                            {hasChunks && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                {progress.done}/{progress.total} parts
                              </span>
                            )}
                            {item.memorization_catalog?.category && (
                              <span className="text-[11px] text-muted-foreground">
                                {item.memorization_catalog.category}
                              </span>
                            )}
                            {item.last_revised_at && (
                              <span className="text-[11px] text-muted-foreground">
                                &middot; Revised {format(new Date(item.last_revised_at), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markRevised(item.id)}
                            className="h-8 text-xs text-amber-600 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600"
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Revised
                          </Button>
                          {!hasChunks && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleMemStatus(item)}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Undo
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => unassignItem(item.id)}
                            aria-label="Remove item"
                            title="Remove item"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {hasChunks && (
                        <div className="p-3">
                          <MemPartWorkspace
                            chunks={chunks}
                            memorizedIds={memorizedChunkIds}
                            onToggle={toggleChunk}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {memItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <BookMarked className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No memorization items</p>
                <p className="text-sm text-muted-foreground">
                  Click &ldquo;Assign&rdquo; to add items for this student
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "fees" && (
        <div className="animate-fade-in-up">
          {/* Fee summary */}
          <div className="flex items-center gap-4 mb-4 text-sm">
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
      )}

      {activeTab === "activity" && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Every page, link and para this student opened — in order, oldest first.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadActivity}
              disabled={activityLoading}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
          <ActivityFeed logs={activity} loading={activityLoading} />
        </div>
      )}

      {activeTab === "portal" && (
        <div className="animate-fade-in-up space-y-4">
          <StudentPortalAccess studentId={student.id} />
          <StudentSignInAccess studentId={student.id} />
          <StudentQaidaAssign studentId={student.id} qaidaMediaId={student.qaida_media_id} />
          <StudentNamazAssign studentId={student.id} />
          <StudentForceSignOut studentId={student.id} />
        </div>
      )}

      {/* Update Progress Dialog */}
      <Dialog open={roundEditOpen} onOpenChange={setRoundEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              {activeRound?.type === "qaida"
                ? "Norani Qaida"
                : `Quran Round ${activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 1}`}
            </DialogDescription>
          </DialogHeader>
          {activeRound?.type === "quran" ? (
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paras from End (30→)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={roundForm.desc_completed}
                    onChange={(e) => setRoundForm({ ...roundForm, desc_completed: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currently on Para</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={roundForm.asc_completed}
                    onChange={(e) => setRoundForm({ ...roundForm, asc_completed: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={saveRoundProgress}>Save</Button>
                <Button variant="outline" onClick={() => setRoundEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Qaida has no para progress. Use &ldquo;Complete&rdquo; to finish this round.
              </p>
              <Button variant="outline" onClick={() => setRoundEditOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Round Dialog */}
      <Dialog open={newRoundOpen} onOpenChange={setNewRoundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Round</DialogTitle>
            <DialogDescription>Add a new or past completed round</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center rounded-xl border border-border/50 bg-secondary/30 p-1 gap-1">
              <button
                type="button"
                onClick={() => setNewRoundForm({ ...newRoundForm, type: "qaida" })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${newRoundForm.type === "qaida" ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
              >
                Norani Qaida
              </button>
              <button
                type="button"
                onClick={() => setNewRoundForm({ ...newRoundForm, type: "quran" })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${newRoundForm.type === "quran" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}
              >
                Quran Reading
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setNewRoundForm({ ...newRoundForm, is_completed: !newRoundForm.is_completed })
              }
              className="flex items-center gap-3 w-full rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left hover:bg-secondary/40 transition-all"
            >
              <div
                className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${newRoundForm.is_completed ? "bg-emerald-500" : "bg-secondary"}`}
              >
                <div
                  className="h-4 w-4 rounded-full bg-card shadow-sm mt-0.5"
                  style={{
                    transform: newRoundForm.is_completed ? "translateX(16px)" : "translateX(2px)",
                    transition: "transform 0.2s",
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Already completed</p>
                <p className="text-xs text-muted-foreground">Toggle on for a past round</p>
              </div>
            </button>

            <div className={`grid gap-4 ${newRoundForm.is_completed ? "sm:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newRoundForm.started_at}
                  onChange={(e) => setNewRoundForm({ ...newRoundForm, started_at: e.target.value })}
                />
              </div>
              {newRoundForm.is_completed && (
                <div className="space-y-2">
                  <Label>Completed Date</Label>
                  <Input
                    type="date"
                    value={newRoundForm.completed_at}
                    onChange={(e) =>
                      setNewRoundForm({ ...newRoundForm, completed_at: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {!newRoundForm.is_completed && newRoundForm.type === "quran" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paras from End (30→)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={newRoundForm.desc_completed}
                    onChange={(e) =>
                      setNewRoundForm({ ...newRoundForm, desc_completed: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currently on Para</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={newRoundForm.asc_completed}
                    onChange={(e) =>
                      setNewRoundForm({ ...newRoundForm, asc_completed: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {newRoundForm.is_completed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-400">
                  {newRoundForm.type === "quran"
                    ? "Saved as fully completed (30/30)."
                    : "Saved as completed Qaida round."}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button onClick={startNewRound}>
                {newRoundForm.is_completed ? (
                  <>
                    <Trophy className="h-3.5 w-3.5 mr-1" />
                    Add Completed Round
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start Round
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setNewRoundOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Round Dialog */}
      <Dialog
        open={!!editingRound}
        onOpenChange={(open) => {
          if (!open) setEditingRound(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Round</DialogTitle>
            <DialogDescription>
              {editingRound?.type === "qaida"
                ? "Norani Qaida"
                : `Quran Round ${editingRound ? getChronologicalRoundNumber(rounds, editingRound) : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={() =>
                setEditRoundForm({ ...editRoundForm, is_completed: !editRoundForm.is_completed })
              }
              className="flex items-center gap-3 w-full rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left hover:bg-secondary/40 transition-all"
            >
              <div
                className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${editRoundForm.is_completed ? "bg-emerald-500" : "bg-secondary"}`}
              >
                <div
                  className="h-4 w-4 rounded-full bg-card shadow-sm mt-0.5"
                  style={{
                    transform: editRoundForm.is_completed ? "translateX(16px)" : "translateX(2px)",
                    transition: "transform 0.2s",
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-xs text-muted-foreground">Mark as completed round</p>
              </div>
            </button>

            <div className={`grid gap-4 ${editRoundForm.is_completed ? "sm:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editRoundForm.started_at}
                  onChange={(e) =>
                    setEditRoundForm({ ...editRoundForm, started_at: e.target.value })
                  }
                />
              </div>
              {editRoundForm.is_completed && (
                <div className="space-y-2">
                  <Label>Completed Date</Label>
                  <Input
                    type="date"
                    value={editRoundForm.completed_at}
                    onChange={(e) =>
                      setEditRoundForm({ ...editRoundForm, completed_at: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {!editRoundForm.is_completed && editingRound?.type === "quran" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paras from End (30→)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={editRoundForm.desc_completed}
                    onChange={(e) =>
                      setEditRoundForm({ ...editRoundForm, desc_completed: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currently on Para</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={editRoundForm.asc_completed}
                    onChange={(e) =>
                      setEditRoundForm({ ...editRoundForm, asc_completed: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {editRoundForm.is_completed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-400">
                  {editingRound?.type === "quran"
                    ? "Saved as fully completed (30/30)."
                    : "Saved as completed Qaida round."}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button onClick={saveEditRound}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingRound(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
