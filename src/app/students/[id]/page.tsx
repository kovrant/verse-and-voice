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
import { QuranProgress } from "@/components/quran-progress"
import { ArrowLeft, Pencil, Check, X, CreditCard, Clock, BookOpen, CalendarDays, Sparkles, MapPin, Plus, Trash2, RotateCcw, BookMarked } from "lucide-react"
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
  is_qaida: boolean
  desc_completed: number
  asc_completed: number
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
  const [editForm, setEditForm] = useState({
    fee: "",
    fee_currency: "GBP",
    is_qaida: true,
    desc_completed: "0",
    asc_completed: "0",
    class_time: "",
    country: "",
    status: "Reading" as StudentStatus,
    ended_at: "",
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
      is_qaida: data.is_qaida ?? true,
      desc_completed: (data.desc_completed ?? 0).toString(),
      asc_completed: (data.asc_completed ?? 0).toString(),
      class_time: data.class_time || "",
      country: data.country || "",
      status: data.status || "Reading",
      ended_at: data.ended_at || "",
    })

    await ensureFeeRecords(data)
    await Promise.all([loadFees(), loadMemItems(), loadCatalog()])
    setLoading(false)
  }, [params.id, router])

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
        is_qaida: editForm.is_qaida,
        desc_completed: parseInt(editForm.desc_completed) || 0,
        asc_completed: parseInt(editForm.asc_completed) || 0,
        class_time: editForm.class_time || null,
        country: editForm.country || null,
        status: editForm.status,
        ended_at: editForm.ended_at || null,
      })
      .eq("id", params.id)

    setEditOpen(false)
    loadStudent()
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
  const cs = CURRENCY_SYMBOLS[student.fee_currency]
  const completedFromAsc = student.asc_completed > 0 ? student.asc_completed - 1 : 0
  const paraProgress = ((student.desc_completed + completedFromAsc) / 30) * 100
  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/students">
          <Button variant="outline" size="icon" className="rounded-xl mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Guardian: {student.guardian_name}
                {student.country && <span> &middot; {student.country}</span>}
              </p>
            </div>
          </div>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
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
                  <Select
                    value={editForm.country}
                    onValueChange={(val) => setEditForm({ ...editForm, country: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              {/* Qaida / Quran toggle */}
              <div className="space-y-3">
                <Label>Learning Stage</Label>
                <div className="flex items-center rounded-xl border border-border/50 bg-secondary/30 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_qaida: true, desc_completed: "0", asc_completed: "0" })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      editForm.is_qaida
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Norani Qaida
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_qaida: false })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      !editForm.is_qaida
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Reading Quran
                  </button>
                </div>
              </div>
              {!editForm.is_qaida && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Paras from End (30→)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={editForm.desc_completed}
                      onChange={(e) => setEditForm({ ...editForm, desc_completed: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currently on Para</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={editForm.asc_completed}
                      onChange={(e) => setEditForm({ ...editForm, asc_completed: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Class Time</Label>
                <TimePicker
                  value={editForm.class_time}
                  onChange={(val) => setEditForm({ ...editForm, class_time: val })}
                  placeholder="Select class time"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm({ ...editForm, status: val as StudentStatus })}
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
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Fee</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} size="lg" />
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quran</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <QuranProgress
              isQaida={student.is_qaida}
              descCompleted={student.desc_completed}
              ascCompleted={student.asc_completed}
              variant="card"
            />
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student.class_time || "--"}</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{daysSinceStart}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
            <p className="text-xs text-muted-foreground mt-1">Since {format(new Date(student.started_at), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Extra Details Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {student.country && (
          <Card className="group relative overflow-hidden hover:border-border">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 flex-shrink-0">
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Country</p>
                <p className="font-semibold">{student.country}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {student.ended_at && (
          <Card className="group relative overflow-hidden hover:border-border">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">End Date</p>
                <p className="font-semibold">{format(new Date(student.ended_at), "MMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Memorization Tracking */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-amber-400" />
              <CardTitle>Memorization</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setAssignOpen(!assignOpen); if (!assignOpen) loadCatalog() }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Assign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assign from catalog */}
          {assignOpen && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign from Catalog</p>
              <div className="flex flex-wrap gap-2">
                {catalog
                  .filter(c => !memItems.some(m => m.catalog_id === c.id))
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => assignItem(item.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      {item.title}
                      <span className="text-muted-foreground/40">({item.category})</span>
                    </button>
                  ))}
                {catalog.filter(c => !memItems.some(m => m.catalog_id === c.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground">All catalog items are already assigned.</p>
                )}
              </div>
            </div>
          )}

          {/* Currently memorizing */}
          {memItems.filter(m => m.status === "memorizing").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Currently Memorizing
              </p>
              <div className="space-y-1.5">
                {memItems.filter(m => m.status === "memorizing").map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 group">
                    {item.memorization_catalog?.image_url && (
                      <img src={item.memorization_catalog.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm font-medium text-amber-300">{item.memorization_catalog?.title}</span>
                    <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground/60">{item.memorization_catalog?.category}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMemStatus(item)}
                      className="h-7 text-xs text-emerald-400 hover:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignItem(item.id)}
                      className="h-7 text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Already memorized */}
          {memItems.filter(m => m.status === "memorized").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Memorized ({memItems.filter(m => m.status === "memorized").length})
              </p>
              <div className="space-y-1.5">
                {memItems.filter(m => m.status === "memorized").map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 px-4 py-2.5 group">
                    {item.memorization_catalog?.image_url && (
                      <img src={item.memorization_catalog.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-muted-foreground">{item.memorization_catalog?.title}</span>
                    {item.last_revised_at && (
                      <span className="text-[10px] text-muted-foreground/60">
                        Revised {format(new Date(item.last_revised_at), "MMM d")}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRevised(item.id)}
                      title="Mark as revised today"
                      className="h-7 text-xs text-amber-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Revised
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMemStatus(item)}
                      className="h-7 text-xs text-muted-foreground hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Undo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignItem(item.id)}
                      className="h-7 text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No memorization items assigned. Click &ldquo;Assign&rdquo; to add from the catalog.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fee Payment History */}
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
