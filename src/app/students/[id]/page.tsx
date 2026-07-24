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
  ExternalLink,
  FileText,
  History,
  KeyRound,
  MapPin,
  MousePointerClick,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { FeeDisplay } from "@/components/fee-display"
import { QuranJourney } from "@/components/quran-journey"
import {
  getActiveRound,
  getChronologicalRoundNumber,
  QuranProgress,
  type QuranRound,
} from "@/components/quran-progress"
import { StudentPortalAccess } from "@/components/student-portal-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { SortableHeader, type SortDirection, toggleSort } from "@/components/ui/sortable-header"
import { TimePicker } from "@/components/ui/time-picker"
import { useExchangeRates } from "@/lib/exchange-rates"
import { fetchAllRows, supabase } from "@/lib/supabase"
import {
  cn,
  COUNTRIES,
  formatLocalDate,
  parseLocalDate,
  STATUS_CONFIG,
  type StudentStatus,
} from "@/lib/utils"

interface Student {
  id: string
  name: string
  guardian_name: string
  country: string | null
  started_at: string
  ended_at: string | null
  status: StudentStatus
  fee: number
  fee_currency: string
  class_time: string | null
  created_at: string
}

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

interface StudentMemItem {
  id: string
  catalog_id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: CatalogItem
}

interface FeePayment {
  id: string
  month: number
  year: number
  is_paid: boolean
  paid_at: string | null
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

interface ActivityLog {
  id: string
  event_type: "page_view" | "link_click" | "click" | "para_open" | "pdf_page"
  path: string | null
  label: string | null
  href: string | null
  meta: Record<string, unknown> | null
  occurred_at: string
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
      .select("*, memorization_catalog(id, title, category, image_url)")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false })
    setMemItems((data as any) || [])
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
    await supabase
      .from("quran_rounds")
      .update({ completed_at: formatLocalDate() })
      .eq("id", active.id)
    await loadRounds()
    toast.success("Round marked as completed")
  }

  async function saveRoundProgress() {
    const active = getActiveRound(rounds)
    if (!active) return

    await supabase
      .from("quran_rounds")
      .update({
        desc_completed: parseInt(roundForm.desc_completed) || 0,
        asc_completed: parseInt(roundForm.asc_completed) || 0,
      })
      .eq("id", active.id)

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
        const { error: closeError } = await supabase
          .from("quran_rounds")
          .update({ completed_at: newRoundForm.started_at || formatLocalDate() })
          .eq("id", active.id)
        if (closeError) {
          toast.error(closeError.message)
          return
        }
      }
    }

    const { error } = await supabase.from("quran_rounds").insert({
      student_id: params.id,
      type: newRoundForm.type,
      round_number: nextNum,
      started_at: newRoundForm.started_at,
      completed_at: newRoundForm.is_completed
        ? newRoundForm.completed_at || formatLocalDate()
        : null,
      desc_completed: desc,
      asc_completed: asc,
    })

    if (error) {
      toast.error(error.message)
      return
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
    const desc = editRoundForm.is_completed ? 30 : parseInt(editRoundForm.desc_completed) || 0
    const asc = editRoundForm.is_completed ? 0 : parseInt(editRoundForm.asc_completed) || 0

    const { error } = await supabase
      .from("quran_rounds")
      .update({
        started_at: editRoundForm.started_at,
        completed_at: editRoundForm.is_completed
          ? editRoundForm.completed_at || formatLocalDate()
          : null,
        desc_completed: desc,
        asc_completed: asc,
      })
      .eq("id", editingRound.id)

    if (error) {
      toast.error(error.message)
      return
    }

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
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shimmer rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-8 w-48 shimmer rounded-lg" />
            <div className="h-5 w-64 shimmer rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-64 shimmer rounded-2xl" />
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
                  <Label>Class Time</Label>
                  <TimePicker
                    value={editForm.class_time}
                    onChange={(val) => setEditForm({ ...editForm, class_time: val })}
                    placeholder="Select class time"
                  />
                </div>
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
            <p className="text-[11px] text-muted-foreground">Class time</p>
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
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-green-500/25 bg-gradient-to-r from-green-400/[0.10] to-lime-400/[0.04] p-3 shadow-soft"
                  >
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
                        {item.memorization_catalog?.category && (
                          <span className="text-[11px] text-muted-foreground">
                            {item.memorization_catalog.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMemStatus(item)}
                        className="h-8 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Mark done
                      </Button>
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
                ))}
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
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3 shadow-soft"
                  >
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMemStatus(item)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Undo
                      </Button>
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
                ))}
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
        <div className="animate-fade-in-up">
          <StudentPortalAccess studentId={student.id} />
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

const EVENT_STYLES: Record<
  ActivityLog["event_type"],
  { icon: typeof Activity; tint: string; verb: string }
> = {
  page_view: { icon: FileText, tint: "text-blue-400 bg-blue-500/10", verb: "Viewed page" },
  para_open: { icon: BookOpen, tint: "text-emerald-400 bg-emerald-500/10", verb: "Opened" },
  pdf_page: { icon: FileText, tint: "text-amber-400 bg-amber-500/10", verb: "Turned to" },
  link_click: { icon: ExternalLink, tint: "text-purple-400 bg-purple-500/10", verb: "Clicked link" },
  click: { icon: MousePointerClick, tint: "text-muted-foreground bg-secondary", verb: "Clicked" },
}

function activityPrimaryText(log: ActivityLog): string {
  const style = EVENT_STYLES[log.event_type]
  const detail = log.label || log.href || log.path || "—"
  return `${style.verb} ${detail}`.trim()
}

function ActivityFeed({ logs, loading }: { logs: ActivityLog[]; loading: boolean }) {
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 shimmer rounded-xl" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center bg-card rounded-[16px] border border-border">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Clicks and page opens will appear here once the student uses the portal.
        </p>
      </div>
    )
  }

  // Group by calendar day for a scannable timeline.
  const groups: { day: string; items: ActivityLog[] }[] = []
  for (const log of logs) {
    const day = format(new Date(log.occurred_at), "EEEE, MMM d, yyyy")
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(log)
    else groups.push({ day, items: [log] })
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.day}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {group.day}
          </p>
          <div className="bg-card rounded-[16px] border border-border overflow-hidden">
            {group.items.map((log, i) => {
              const style = EVENT_STYLES[log.event_type]
              const Icon = style.icon
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < group.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${style.tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activityPrimaryText(log)}
                    </p>
                    {log.path && (
                      <p className="text-[11px] text-muted-foreground truncate">{log.path}</p>
                    )}
                  </div>
                  <span
                    className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums"
                    title={format(new Date(log.occurred_at), "MMM d, yyyy h:mm:ss a")}
                  >
                    {format(new Date(log.occurred_at), "h:mm a")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatSessionDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s}s`
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function paraSummary(s: ClassSession): { label: string; title: string } | null {
  const covered = (s.paras_covered || []).filter((n) => n != null)
  if (covered.length > 0) {
    const sorted = [...covered].sort((a, b) => a - b)
    if (sorted.length === 1) return { label: `Para ${sorted[0]}`, title: `Para ${sorted[0]}` }
    return { label: `${sorted.length} paras`, title: `Paras ${sorted.join(", ")}` }
  }
  if (s.starting_para != null && s.ending_para != null) {
    const range =
      s.starting_para === s.ending_para
        ? `Para ${s.starting_para}`
        : `Paras ${s.starting_para}–${s.ending_para}`
    return { label: range, title: range }
  }
  return null
}

function MemThumb({ src }: { src?: string | null }) {
  if (!src) {
    return (
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
        <BookMarked className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-white">
      <img src={src} alt="" className="h-full w-full object-contain p-1" />
    </div>
  )
}

function SessionStat({
  icon: Icon,
  tint,
  value,
  label,
}: {
  icon: typeof Clock
  tint: string
  value: string | number
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-lg font-bold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function FeeHistoryTable({
  fees,
  sortKey,
  sortDir,
  page,
  pageSize,
  onSort,
  onPageChange,
  onToggleFee,
}: {
  fees: FeePayment[]
  sortKey: string | null
  sortDir: SortDirection
  page: number
  pageSize: number
  onSort: (key: string) => void
  onPageChange: (page: number) => void
  onToggleFee: (fee: FeePayment) => void
}) {
  function getFeeSort(fee: FeePayment, key: string): any {
    if (key === "month_year") return fee.year * 100 + fee.month
    if (key === "is_paid") return fee.is_paid ? 1 : 0
    if (key === "paid_at") return fee.paid_at || ""
    return (fee as any)[key]
  }

  const sorted =
    sortKey && sortDir
      ? [...fees].sort((a, b) => {
          const aVal = getFeeSort(a, sortKey)
          const bVal = getFeeSort(b, sortKey)
          if (aVal == null && bVal == null) return 0
          if (aVal == null) return sortDir === "asc" ? -1 : 1
          if (bVal == null) return sortDir === "asc" ? 1 : -1
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDir === "asc" ? aVal - bVal : bVal - aVal
          }
          const cmp = String(aVal).localeCompare(String(bVal))
          return sortDir === "asc" ? cmp : -cmp
        })
      : fees

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          <CardTitle>Fee Payment History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {fees.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No fee records yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Month"
                        sortKey="month_year"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Status"
                        sortKey="is_paid"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Paid Date"
                        sortKey="paid_at"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-sm">
                        {MONTH_NAMES[fee.month - 1]} {fee.year}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={fee.is_paid ? "success" : "warning"}>
                          {fee.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {fee.paid_at ? format(new Date(fee.paid_at), "MMM d, yyyy h:mm a") : "--"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={fee.is_paid ? "outline" : "default"}
                          onClick={() => onToggleFee(fee)}
                        >
                          {fee.is_paid ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Unpaid
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > pageSize && (
              <div className="pt-4 border-t border-border/50">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={sorted.length}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
