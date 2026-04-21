"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS, STATUS_CONFIG, type StudentStatus } from "@/lib/utils"
import { useExchangeRates } from "@/lib/exchange-rates"
import { FeeDisplay } from "@/components/fee-display"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { SortableHeader, sortData, toggleSort, type SortDirection } from "@/components/ui/sortable-header"
import { QuranProgress, type QuranRound } from "@/components/quran-progress"
import { Plus, Search, Users, ArrowRight, MapPin, Settings2, Eye, EyeOff } from "lucide-react"
import { format } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  country: string | null
  started_at: string
  status: StudentStatus
  fee: number
  fee_currency: string
  is_qaida: boolean
  desc_completed: number
  asc_completed: number
  class_time: string | null
}

type ColumnKey = "country" | "started_at" | "fee" | "class_time" | "quran_progress" | "status"

interface ColumnConfig {
  key: ColumnKey
  label: string
  sortKey: string
  default: boolean
}

const ALL_COLUMNS: ColumnConfig[] = [
  { key: "country",     label: "Country",    sortKey: "country",    default: true },
  { key: "started_at",  label: "Admission",  sortKey: "started_at", default: true },
  { key: "fee",         label: "Fee",        sortKey: "fee",        default: true },
  { key: "class_time",  label: "Class Time", sortKey: "class_time", default: true },
  { key: "quran_progress", label: "Quran",    sortKey: "asc_completed", default: false },
  { key: "status",      label: "Status",     sortKey: "status",     default: true },
]

const STORAGE_KEY = "quran-academy-students-columns"
const SORT_STORAGE_KEY = "quran-academy-students-sort"
const FILTER_STORAGE_KEY = "quran-academy-students-filter"

function loadColumns(): Set<ColumnKey> {
  if (typeof window === "undefined") return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return new Set(JSON.parse(saved) as ColumnKey[])
  } catch {}
  return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
}

function loadSort(): { key: string | null; dir: SortDirection } {
  if (typeof window === "undefined") return { key: null, dir: null }
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { key: null, dir: null }
}

function loadFilter(): string {
  if (typeof window === "undefined") return "Reading"
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) return saved
  } catch {}
  return "Reading"
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(loadFilter)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<string | null>(() => loadSort().key)
  const [sortDir, setSortDir] = useState<SortDirection>(() => loadSort().dir)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { rates } = useExchangeRates()
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(loadColumns)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [roundsMap, setRoundsMap] = useState<Record<string, QuranRound[]>>({})

  useEffect(() => {
    loadStudents()
  }, [])

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function loadStudents() {
    const [studentsRes, roundsRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("quran_rounds").select("*").order("round_number", { ascending: true }),
    ])
    setStudents(studentsRes.data || [])

    // Group rounds by student_id
    const map: Record<string, QuranRound[]> = {}
    ;(roundsRes.data || []).forEach((r: QuranRound) => {
      if (!map[r.student_id]) map[r.student_id] = []
      map[r.student_id].push(r)
    })
    setRoundsMap(map)
    setLoading(false)
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const isVisible = (key: ColumnKey) => visibleCols.has(key)

  const filtered = students.filter((s) => {
    const matchesStatus = statusFilter === "All" || s.status === statusFilter
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.guardian_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.country?.toLowerCase() || "").includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const sorted = sortData(filtered, sortKey, sortDir)
  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  function handleSort(key: string) {
    const result = toggleSort(sortKey, sortDir, key)
    const newKey = result.direction ? result.key : null
    const newDir = result.direction
    setSortKey(newKey)
    setSortDir(newDir)
    setPage(1)
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: newKey, dir: newDir }))
  }

  useEffect(() => { setPage(1) }, [search, statusFilter])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 shimmer rounded-lg" />
            <div className="h-5 w-48 shimmer rounded-lg" />
          </div>
          <div className="h-11 w-36 shimmer rounded-xl" />
        </div>
        <div className="h-11 w-80 shimmer rounded-xl" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 shimmer rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-gold">Students</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length === students.length
              ? `${students.length} total students enrolled`
              : `${filtered.length} of ${students.length} students`}
          </p>
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </Link>
      </div>

      {/* Toolbar: Search + Status Filter + Column Settings */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, guardian, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status tabs */}
          <div className="flex items-center rounded-xl border border-border/50 bg-card p-1 gap-1">
            {["Reading", "Completed", "Left Uncompleted", "All"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatusFilter(s); localStorage.setItem(FILTER_STORAGE_KEY, s) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Column settings */}
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`flex items-center justify-center h-[38px] w-[38px] rounded-xl border border-border/50 transition-all ${
                settingsOpen
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title="Column settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/20 overflow-hidden z-50 animate-fade-in-up">
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Show Columns</p>
                </div>
                <div className="p-2">
                  {/* Student column is always visible */}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50">
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm font-medium">Student</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Always on</span>
                  </div>

                  {ALL_COLUMNS.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-secondary"
                    >
                      {isVisible(col.key) ? (
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={`text-sm font-medium ${isVisible(col.key) ? "text-foreground" : "text-muted-foreground/60"}`}>
                        {col.label}
                      </span>
                      <div className={`ml-auto h-4 w-7 rounded-full transition-colors ${isVisible(col.key) ? "bg-emerald-500" : "bg-secondary"}`}>
                        <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${isVisible(col.key) ? "translate-x-3.5" : "translate-x-0.5"}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            {students.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-1">No students yet</p>
                <p className="text-sm text-muted-foreground mb-5">Add your first student to get started</p>
                <Link href="/students/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No students match your filters</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 lg:hidden">
            {paginated.map((student) => {
              const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading
              return (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <Card className="group hover:border-border transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{student.name}</p>
                            <Badge variant={statusCfg.variant} className="flex-shrink-0">{statusCfg.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{student.guardian_name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} />
                            {student.class_time && (
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground/40">&middot;</span>
                                {student.class_time}
                              </span>
                            )}
                            {student.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {student.country}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop table view */}
          <Card className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th scope="col" className="px-5 py-4 text-left">
                      <SortableHeader label="Student" sortKey="name" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                    </th>
                    {isVisible("country") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Country" sortKey="country" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    {isVisible("started_at") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Admission" sortKey="started_at" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    {isVisible("fee") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Fee" sortKey="fee" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    {isVisible("class_time") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Class Time" sortKey="class_time" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    {isVisible("quran_progress") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Quran" sortKey="asc_completed" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    {isVisible("status") && (
                      <th scope="col" className="px-5 py-4 text-left">
                        <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      </th>
                    )}
                    <th scope="col" className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((student) => {
                    const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.Reading
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold flex-shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.guardian_name}</p>
                            </div>
                          </div>
                        </td>
                        {isVisible("country") && (
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {student.country ? (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                {student.country}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">--</span>
                            )}
                          </td>
                        )}
                        {isVisible("started_at") && (
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {format(new Date(student.started_at), "MMM d, yyyy")}
                          </td>
                        )}
                        {isVisible("fee") && (
                          <td className="px-5 py-4">
                            <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} />
                          </td>
                        )}
                        {isVisible("class_time") && (
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {student.class_time || <span className="text-muted-foreground/40">--</span>}
                          </td>
                        )}
                        {isVisible("quran_progress") && (
                          <td className="px-5 py-4">
                            <QuranProgress
                              rounds={roundsMap[student.id] || []}
                              variant="compact"
                            />
                          </td>
                        )}
                        {isVisible("status") && (
                          <td className="px-5 py-4">
                            <Badge variant={statusCfg.variant}>
                              {statusCfg.label}
                            </Badge>
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <Link href={`/students/${student.id}`}>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {sorted.length > pageSize && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={sorted.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
