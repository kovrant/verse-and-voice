"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Users, ArrowRight } from "lucide-react"
import { format } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  fee: number
  fee_currency: string
  para_number: number | null
  class_time: string | null
  is_active: boolean
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.guardian_name.toLowerCase().includes(search.toLowerCase())
  )

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
          <p className="text-muted-foreground mt-1">{students.length} total students enrolled</p>
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or guardian..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11"
        />
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
              <p className="text-muted-foreground">No students match &ldquo;{search}&rdquo;</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Started</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class Time</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Para</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
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
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {format(new Date(student.started_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-emerald-400">
                        {CURRENCY_SYMBOLS[student.fee_currency]}{student.fee.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {student.class_time || <span className="text-muted-foreground/40">--</span>}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {student.para_number ? (
                        <span className="text-amber-400 font-medium">Para {student.para_number}</span>
                      ) : (
                        <span className="text-muted-foreground/40">--</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={student.is_active ? "success" : "secondary"}>
                        {student.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
