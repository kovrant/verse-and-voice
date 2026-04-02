"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuranProgress } from "@/components/quran-progress"
import { Clock, User, Users, Sparkles, CalendarDays } from "lucide-react"
import { differenceInDays } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  is_qaida: boolean
  desc_completed: number
  asc_completed: number
  memorizing: string | null
  class_time: string | null
}

export default function ClassPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, name, guardian_name, started_at, is_qaida, desc_completed, asc_completed, memorizing, class_time")
      .eq("status", "Reading")
      .order("name")
    setStudents(data || [])
    setLoading(false)
  }

  function handleSelect(studentId: string) {
    const student = students.find((s) => s.id === studentId) || null
    setSelected(student)
  }

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Class Session</span>
        </h1>
        <p className="text-muted-foreground mt-1">Select a student to begin the session</p>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">No active students</p>
            <p className="text-sm text-muted-foreground">Add students to use the class viewer</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Student dropdown */}
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

          {/* Class Card */}
          {selected && (
            <Card className="relative overflow-hidden max-w-2xl mx-auto glow-emerald animate-fade-in-up">
              {/* Decorative top bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

              {/* Header with Islamic pattern */}
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
                {/* Class Time */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Class Time</p>
                    <p className="text-2xl font-bold text-amber-300">{selected.class_time || "Not set"}</p>
                  </div>
                </div>

                {/* Quran Progress */}
                <QuranProgress
                  isQaida={selected.is_qaida}
                  descCompleted={selected.desc_completed}
                  ascCompleted={selected.asc_completed}
                  variant="full"
                />

                {/* Currently Memorizing */}
                {selected.memorizing && (
                  <div className="relative p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                    <div className="absolute inset-0 islamic-star opacity-40" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">
                          Currently Memorizing
                        </p>
                      </div>
                      <p className="text-lg font-bold text-amber-300">{selected.memorizing}</p>
                    </div>
                  </div>
                )}

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
          )}
        </>
      )}
    </div>
  )
}
