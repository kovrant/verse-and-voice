"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS, COUNTRIES, STATUS_CONFIG, type StudentStatus } from "@/lib/utils"
import { useExchangeRates } from "@/lib/exchange-rates"
import { FeeDisplay } from "@/components/fee-display"
import { Pagination } from "@/components/ui/pagination"
import { SortableHeader, toggleSort, type SortDirection } from "@/components/ui/sortable-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import { QuranProgress, type QuranRound, getActiveRound, getStudentStage } from "@/components/quran-progress"
import { ArrowLeft, Pencil, Check, X, CreditCard, Clock, BookOpen, CalendarDays, Sparkles, MapPin, Plus, Trash2, RotateCcw, BookMarked, Trophy, Play } from "lucide-react"
import { format, differenceInDays } from "date-fns"

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

  // Edit form (non-quran fields)
  const [editForm, setEditForm] = useState({
    fee: "",
    fee_currency: "GBP",
    class_time: "",
    country: "",
    status: "Reading" as StudentStatus,
    ended_at: "",
  })

  const [activeTab, setActiveTab] = useState<"journey" | "memorization" | "fees">("journey")

  // Round editing
  const [roundEditOpen, setRoundEditOpen] = useState(false)
  const [roundForm, setRoundForm] = useState({
    desc_completed: "0",
    asc_completed: "0",
  })
  const [newRoundOpen, setNewRoundOpen] = useState(false)
  const [newRoundForm, setNewRoundForm] = useState({
    type: "quran" as "qaida" | "quran",
    started_at: new Date().toISOString().split("T")[0],
    completed_at: "",
    desc_completed: "0",
    asc_completed: "0",
    is_completed: false,
  })

  const loadStudent = useCallback(async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.id)
      .single()

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
    await Promise.all([loadRounds(), loadFees(), loadMemItems(), loadCatalog()])
    setLoading(false)
  }, [params.id, router])

  async function loadRounds() {
    const { data } = await supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", params.id)
      .order("round_number", { ascending: true })
    setRounds(data || [])
  }

  async function ensureFeeRecords(s: Student) {
    const startDate = new Date(s.started_at)
    const now = new Date()
    const months: { student_id: string; month: number; year: number }[] = []

    let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (d <= now) {
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
    await supabase.from("student_memorization").upsert({
      student_id: params.id,
      catalog_id: catalogId,
      status: "memorizing",
    }, { onConflict: "student_id,catalog_id" })
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

    setFees(prev => prev.map(f =>
      f.id === fee.id ? { ...f, is_paid: newPaid, paid_at: paidAt } : f
    ))

    await supabase
      .from("fee_payments")
      .update({ is_paid: newPaid, paid_at: paidAt })
      .eq("id", fee.id)
  }

  async function saveEdit() {
    await supabase
      .from("students")
      .update({
        fee: parseFloat(editForm.fee),
        fee_currency: editForm.fee_currency,
        class_time: editForm.class_time || null,
        country: editForm.country || null,
        status: editForm.status,
        ended_at: editForm.ended_at || null,
      })
      .eq("id", params.id)

    setEditOpen(false)
    loadStudent()
  }

  // Round management
  async function completeActiveRound() {
    const active = getActiveRound(rounds)
    if (!active) return
    if (!confirm(`Mark this ${active.type === "qaida" ? "Qaida" : "Quran"} round as completed?`)) return

    await supabase
      .from("quran_rounds")
      .update({ completed_at: new Date().toISOString().split("T")[0] })
      .eq("id", active.id)
    await loadRounds()
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
    const existingOfType = rounds.filter(r => r.type === newRoundForm.type)
    const nextNum = existingOfType.length > 0
      ? Math.max(...existingOfType.map(r => r.round_number)) + 1
      : 1

    const desc = newRoundForm.is_completed ? 30 : (parseInt(newRoundForm.desc_completed) || 0)
    const asc = newRoundForm.is_completed ? 30 : (parseInt(newRoundForm.asc_completed) || 0)

    const { error } = await supabase.from("quran_rounds").insert({
      student_id: params.id,
      type: newRoundForm.type,
      round_number: nextNum,
      started_at: newRoundForm.started_at,
      completed_at: newRoundForm.is_completed ? (newRoundForm.completed_at || new Date().toISOString().split("T")[0]) : null,
      desc_completed: desc,
      asc_completed: asc,
    })

    if (error) {
      alert("Error: " + error.message)
      return
    }

    setNewRoundOpen(false)
    setNewRoundForm({
      type: "quran",
      started_at: new Date().toISOString().split("T")[0],
      completed_at: "",
      desc_completed: "0",
      asc_completed: "0",
      is_completed: false,
    })
    await loadRounds()
  }

  async function deleteRound(roundId: string) {
    if (!confirm("Delete this round? This cannot be undone.")) return
    await supabase.from("quran_rounds").delete().eq("id", roundId)
    await loadRounds()
  }

  useEffect(() => {
    loadStudent()
  }, [loadStudent])

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

  const daysSinceStart = differenceInDays(new Date(), new Date(student.started_at))
  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading
  const activeRound = getActiveRound(rounds)
  const { completedQuranCount } = getStudentStage(rounds)
  const paidCount = fees.filter(f => f.is_paid).length
  const unpaidCount = fees.filter(f => !f.is_paid).length
  const memorizingCount = memItems.filter(m => m.status === "memorizing").length
  const memorizedCount = memItems.filter(m => m.status === "memorized").length

  const TABS = [
    { id: "journey" as const, label: "Quran Journey", icon: BookOpen },
    { id: "memorization" as const, label: "Memorization", icon: BookMarked, count: memorizingCount + memorizedCount },
    { id: "fees" as const, label: "Fees", icon: CreditCard, count: unpaidCount },
  ]

  return (
    <div className="animate-fade-in-up">
      {/* Compact Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/students">
          <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-lg font-bold flex-shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight truncate">{student.name}</h1>
            <Badge variant={statusCfg.variant} className="flex-shrink-0">{statusCfg.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{student.guardian_name}</span>
            {student.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{student.country}</span>}
            <span>{daysSinceStart} days enrolled</span>
            {student.ended_at && <span>Ended {format(new Date(student.ended_at), "MMM yyyy")}</span>}
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
              <DialogDescription>Update details for {student.name} ({student.guardian_name})</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={editForm.country} onValueChange={(val) => setEditForm({ ...editForm, country: val })}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class Time</Label>
                  <TimePicker value={editForm.class_time} onChange={(val) => setEditForm({ ...editForm, class_time: val })} placeholder="Select class time" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Monthly Fee</Label>
                  <Input type="number" value={editForm.fee} onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={editForm.fee_currency} onValueChange={(val) => setEditForm({ ...editForm, fee_currency: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val as StudentStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input type="date" value={editForm.ended_at} onChange={(e) => setEditForm({ ...editForm, ended_at: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
          <CreditCard className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
          <BookOpen className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <QuranProgress rounds={rounds} variant="compact" />
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
          <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{student.class_time || "No time set"}</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
          <CalendarDays className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <span className="text-sm"><span className="font-semibold">{daysSinceStart}</span> <span className="text-muted-foreground">days</span></span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card p-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "journey" && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end">
            {activeRound && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setRoundForm({ desc_completed: (activeRound.desc_completed || 0).toString(), asc_completed: (activeRound.asc_completed || 0).toString() }); setRoundEditOpen(true) }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Update Progress
                </Button>
                <Button variant="outline" size="sm" onClick={completeActiveRound} className="text-emerald-400 hover:text-emerald-300">
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

          {/* Current progress */}
          <QuranProgress rounds={rounds} variant="full" />

          {/* Rounds list */}
          {rounds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Rounds</p>
              {[...rounds].reverse().map(r => {
                const isActive = !r.completed_at
                const desc = r.desc_completed
                const asc = r.asc_completed
                const completedFromAsc = asc > 0 ? asc - 1 : 0
                const total = r.type === "quran" ? desc + completedFromAsc : 0
                const prog = (total / 30) * 100

                return (
                  <div key={r.id} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 group ${isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 bg-secondary/20"}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-secondary"}`}>
                      {r.type === "qaida" ? <BookMarked className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-muted-foreground"}`} /> : r.completed_at ? <Trophy className="h-3.5 w-3.5 text-emerald-400" /> : <BookOpen className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-muted-foreground"}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.type === "qaida" ? "Norani Qaida" : `Quran R${r.round_number}`}</span>
                        {isActive && <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] py-0">Active</Badge>}
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(r.started_at), "MMM yyyy")} → {r.completed_at ? format(new Date(r.completed_at), "MMM yyyy") : "now"}
                        </span>
                        {r.type === "quran" && <span className={`text-[11px] ${isActive ? "text-amber-400" : "text-emerald-400"}`}>{total}/30</span>}
                      </div>
                    </div>
                    {r.type === "quran" && <div className="w-16"><Progress value={prog} /></div>}
                    <Button variant="ghost" size="sm" onClick={() => deleteRound(r.id)} className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {rounds.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No rounds yet. Click &ldquo;Add Round&rdquo; to start tracking.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "memorization" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setAssignOpen(!assignOpen); if (!assignOpen) loadCatalog() }}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Assign
            </Button>
          </div>

          {assignOpen && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign from Catalog</p>
              <div className="flex flex-wrap gap-2">
                {catalog.filter(c => !memItems.some(m => m.catalog_id === c.id)).map(item => (
                  <button key={item.id} type="button" onClick={() => assignItem(item.id)} className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all">
                    <Plus className="h-3 w-3" />{item.title}<span className="text-muted-foreground/40">({item.category})</span>
                  </button>
                ))}
                {catalog.filter(c => !memItems.some(m => m.catalog_id === c.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground">All items assigned.</p>
                )}
              </div>
            </div>
          )}

          {memItems.filter(m => m.status === "memorizing").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />Currently Memorizing
              </p>
              {memItems.filter(m => m.status === "memorizing").map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 group">
                  {item.memorization_catalog?.image_url && <img src={item.memorization_catalog.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />}
                  <span className="flex-1 text-sm font-medium text-amber-300">{item.memorization_catalog?.title}</span>
                  <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground/60">{item.memorization_catalog?.category}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggleMemStatus(item)} className="h-7 text-xs text-emerald-400 hover:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity"><Check className="h-3 w-3 mr-1" />Done</Button>
                  <Button variant="ghost" size="sm" onClick={() => unassignItem(item.id)} className="h-7 text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {memItems.filter(m => m.status === "memorized").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="h-3 w-3" />Memorized ({memorizedCount})
              </p>
              {memItems.filter(m => m.status === "memorized").map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 px-4 py-2.5 group">
                  {item.memorization_catalog?.image_url && <img src={item.memorization_catalog.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />}
                  <span className="flex-1 text-sm text-muted-foreground">{item.memorization_catalog?.title}</span>
                  {item.last_revised_at && <span className="text-[10px] text-muted-foreground/60">Revised {format(new Date(item.last_revised_at), "MMM d")}</span>}
                  <Button variant="ghost" size="sm" onClick={() => markRevised(item.id)} className="h-7 text-xs text-amber-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"><RotateCcw className="h-3 w-3 mr-1" />Revised</Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleMemStatus(item)} className="h-7 text-xs text-muted-foreground hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">Undo</Button>
                  <Button variant="ghost" size="sm" onClick={() => unassignItem(item.id)} className="h-7 text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {memItems.length === 0 && (
            <div className="text-center py-8">
              <BookMarked className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No memorization items assigned.</p>
            </div>
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
            <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} size="sm" />
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

      {/* Update Progress Dialog */}
      <Dialog open={roundEditOpen} onOpenChange={setRoundEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>{activeRound?.type === "qaida" ? "Norani Qaida" : `Quran Round ${activeRound?.round_number || 1}`}</DialogDescription>
          </DialogHeader>
          {activeRound?.type === "quran" ? (
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paras from End (30→)</Label>
                  <Input type="number" min="0" max="30" value={roundForm.desc_completed} onChange={(e) => setRoundForm({ ...roundForm, desc_completed: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Currently on Para</Label>
                  <Input type="number" min="0" max="30" value={roundForm.asc_completed} onChange={(e) => setRoundForm({ ...roundForm, asc_completed: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={saveRoundProgress}>Save</Button>
                <Button variant="outline" onClick={() => setRoundEditOpen(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Qaida has no para progress. Use &ldquo;Complete&rdquo; to finish this round.</p>
              <Button variant="outline" onClick={() => setRoundEditOpen(false)}>Close</Button>
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
              <button type="button" onClick={() => setNewRoundForm({ ...newRoundForm, type: "qaida" })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${newRoundForm.type === "qaida" ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>Norani Qaida</button>
              <button type="button" onClick={() => setNewRoundForm({ ...newRoundForm, type: "quran" })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${newRoundForm.type === "quran" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}>Quran Reading</button>
            </div>

            <button type="button" onClick={() => setNewRoundForm({ ...newRoundForm, is_completed: !newRoundForm.is_completed })} className="flex items-center gap-3 w-full rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left hover:bg-secondary/40 transition-all">
              <div className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${newRoundForm.is_completed ? "bg-emerald-500" : "bg-secondary"}`}>
                <div className="h-4 w-4 rounded-full bg-white shadow-sm mt-0.5" style={{ transform: newRoundForm.is_completed ? "translateX(16px)" : "translateX(2px)", transition: "transform 0.2s" }} />
              </div>
              <div>
                <p className="text-sm font-medium">Already completed</p>
                <p className="text-xs text-muted-foreground">Toggle on for a past round</p>
              </div>
            </button>

            <div className={`grid gap-4 ${newRoundForm.is_completed ? "sm:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={newRoundForm.started_at} onChange={(e) => setNewRoundForm({ ...newRoundForm, started_at: e.target.value })} />
              </div>
              {newRoundForm.is_completed && (
                <div className="space-y-2">
                  <Label>Completed Date</Label>
                  <Input type="date" value={newRoundForm.completed_at} onChange={(e) => setNewRoundForm({ ...newRoundForm, completed_at: e.target.value })} />
                </div>
              )}
            </div>

            {!newRoundForm.is_completed && newRoundForm.type === "quran" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paras from End (30→)</Label>
                  <Input type="number" min="0" max="30" value={newRoundForm.desc_completed} onChange={(e) => setNewRoundForm({ ...newRoundForm, desc_completed: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Currently on Para</Label>
                  <Input type="number" min="0" max="30" value={newRoundForm.asc_completed} onChange={(e) => setNewRoundForm({ ...newRoundForm, asc_completed: e.target.value })} />
                </div>
              </div>
            )}

            {newRoundForm.is_completed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-400">{newRoundForm.type === "quran" ? "Saved as fully completed (30/30)." : "Saved as completed Qaida round."}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button onClick={startNewRound}>
                {newRoundForm.is_completed ? <><Trophy className="h-3.5 w-3.5 mr-1" />Add Completed Round</> : <><Play className="h-3.5 w-3.5 mr-1" />Start Round</>}
              </Button>
              <Button variant="outline" onClick={() => setNewRoundOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

  const sorted = sortKey && sortDir
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
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Month" sortKey="month_year" currentSort={sortKey} currentDirection={sortDir} onSort={onSort} />
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Status" sortKey="is_paid" currentSort={sortKey} currentDirection={sortDir} onSort={onSort} />
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Paid Date" sortKey="paid_at" currentSort={sortKey} currentDirection={sortDir} onSort={onSort} />
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((fee) => (
                    <tr key={fee.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
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
