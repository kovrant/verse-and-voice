"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import * as Popover from "@radix-ui/react-popover"
import { differenceInDays, format, formatDistanceToNow, subMonths } from "date-fns"
import {
  Activity,
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  FileText,
  History,
  MapPin,
  Pencil,
  Play,
  Plus,
  Tablet,
  Trash2,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { ClassDaysPicker } from "@/components/class-days-picker"
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
  getChronologicalRoundNumber,
  type QuranRound,
} from "@/components/quran-progress"
import { StudentAchievementsPanel } from "@/components/student-achievements-panel"
import { ActivityFeed, type ActivityLog } from "@/components/student-activity-feed"
import { StudentDetailNav, studentNavItems, type StudentView } from "@/components/student-detail-nav"
import { FeeHistoryTable } from "@/components/student-fee-history"
import { StudentForceSignOut } from "@/components/student-force-signout"
import { type HistorySection, StudentOverview } from "@/components/student-overview"
import { StudentPortalAccess } from "@/components/student-portal-access"
import {
  type ClassSession,
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
import {
  awardMemLesson,
  type RoundProgress,
  syncMemChunkAchievements,
  syncQuranRoundAchievements,
} from "@/lib/achievements"
import { toInputTime, toPktClassTime } from "@/lib/class-time"
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
  const onlineIds = useOnlineStudents()
  const [memItems, setMemItems] = useState<StudentMemItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [chunksByItem, setChunksByItem] = useState<Record<string, MemChunk[]>>({})
  const [memorizedChunkIds, setMemorizedChunkIds] = useState<Set<string>>(new Set())
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
  const [achievementCount, setAchievementCount] = useState(0)

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

  const [activeTab, setActiveTab] = useState<StudentView>("overview")
  const [historySection, setHistorySection] = useState<HistorySection>("all")

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
    // Query pulls the 500 most-recent events (newest at top).
    setActivity((data as ActivityLog[]) || [])
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
    setNewRoundForm({
      type: "quran",
      started_at: formatLocalDate(),
      completed_at: "",
      desc_completed: "0",
      asc_completed: "0",
      is_completed: false,
    })
    await loadRounds()
    void loadAchievementCount()
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
          (r.started_at.localeCompare(nextStartedAt) > 0 ||
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

  // Reset Sessions pagination when entering the history tab
  useEffect(() => {
    if (activeTab === "history") setSessionPage(1)
  }, [activeTab])

  // Lazy-load activity when entering the history tab
  useEffect(() => {
    if (activeTab === "history" && !activityLoaded && !activityLoading) {
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
  const revisingCount = memItems.filter((m) => m.status === "memorized" && m.revision_assigned_at).length
  const now = new Date()
  const currentFee = fees.find(
    (f) => f.month === now.getMonth() + 1 && f.year === now.getFullYear(),
  )
  const currentMonthUnpaid = Boolean(currentFee && !currentFee.is_paid)
  const isOnline = onlineIds.has(student.id)
  const lastSession = sessions[0]
  const progressHint = activeRound
    ? activeRound.type === "qaida"
      ? "Qaida"
      : `Para ${activeRound.asc_completed || 1}`
    : "No active round"

  const scheduleDaysLabel = student.class_days?.length
    ? student.class_days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
        .join(" · ")
    : null

  const navItems = studentNavItems({
    lastClassLabel: lastSession
      ? formatDistanceToNow(new Date(lastSession.started_at), { addSuffix: true })
      : undefined,
    sessionCount: sessions.length,
    memInProgress: memorizingCount,
    revisingCount,
    unpaidThisMonth: currentMonthUnpaid,
    progressHint,
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

      {/* Command Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link href="/students">
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xl font-bold flex-shrink-0">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
                      ? `Last active on this device: ${new Date(student.last_device_at).toLocaleString()}`
                      : undefined
                  }
                >
                  <Tablet className="h-3 w-3 text-primary" />
                  {student.last_device}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground mt-1.5">
              <span>{student.guardian_name}</span>
              {student.country && (
                <>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {student.country}
                  </span>
                </>
              )}
              {(student.class_time || scheduleDaysLabel) && (
                <>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {student.class_time || "No time"}
                    {scheduleDaysLabel ? ` (${scheduleDaysLabel})` : ""}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40">&middot;</span>
              <span>{daysSinceStart}d enrolled</span>
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
        </div>

        {/* Right Command Actions: Quick Fee Pill + Edit + Start Class */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {currentFee && (
            currentFee.is_paid ? (
              <button
                type="button"
                onClick={() => setActiveTab("account")}
                title="View billing history"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/15"
              >
                <Check className="h-3.5 w-3.5" />
                {format(now, "MMM")} Fee Paid
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void toggleFee(currentFee)}
                title="Click to mark this month's fee as paid"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {format(now, "MMM")} Fee Unpaid &middot; Mark Paid
              </button>
            )
          )}

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

          <Link href={`/class?student=${student.id}`}>
            <Button size="sm">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start class
            </Button>
          </Link>
        </div>
      </div>

      {/* 3-Mode Top Segmented Navigation */}
      <StudentDetailNav active={activeTab} onChange={setActiveTab} items={navItems} />

      {/* Full-width Workspace */}
      <div className="min-w-0">
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

        {activeTab === "history" && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Sub-filter pill bar for History & Trophies */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All History", icon: History },
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
                    id: "trophies",
                    label: `Trophies (${achievementCount})`,
                    icon: Award,
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
            {(historySection === "all" || historySection === "sessions") &&
              (() => {
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
                        <p className="text-sm font-semibold text-foreground mb-1">
                          No sessions yet
                        </p>
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
                            value={
                              lastSession ? format(new Date(lastSession.started_at), "MMM d") : "--"
                            }
                            label="Last class"
                          />
                        </div>

                        {/* Cleanup toolbar — only when there are sessions older than 1 month */}
                        {oldSessionsCount > 0 && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-2.5">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {oldSessionsCount}
                              </span>{" "}
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
                                    This removes every session older than 1 month for {student.name}
                                    . Only the last month is kept. This can&rsquo;t be undone.
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
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Newest first ↓
                            </span>
                          </div>

                          <div className="max-h-[520px] overflow-y-auto main-scroll">
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
                                  <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-secondary/40">
                                    <span className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">
                                      {format(started, "MMM")}
                                    </span>
                                    <span className="font-heading text-lg font-bold leading-tight tabular-nums text-foreground">
                                      {format(started, "d")}
                                    </span>
                                  </div>

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

                                  <div className="flex flex-shrink-0 items-center gap-1.5">
                                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                                      {formatDistanceToNow(started, { addSuffix: true })}
                                    </span>
                                    <Popover.Root
                                      open={sessionToDelete?.id === session.id}
                                      onOpenChange={(open) =>
                                        setSessionToDelete(open ? session : null)
                                      }
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
              })()}

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

            {/* 3. TROPHIES & CERTIFICATES SECTION */}
            {(historySection === "all" || historySection === "trophies") && (
              <StudentAchievementsPanel
                studentId={student.id}
                onUpdated={() => void loadAchievementCount()}
              />
            )}

            {/* 4. PORTAL ACTIVITY SECTION */}
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
