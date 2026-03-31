"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, User, Users, Sparkles, CalendarDays } from "lucide-react"
import { differenceInDays } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  para_number: number | null
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
      .select("id, name, guardian_name, started_at, para_number, memorizing, class_time")
      .eq("is_active", true)
      .order("name")
    setStudents(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-40 shimmer rounded-lg" />
          <div className="h-5 w-64 shimmer rounded-lg" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Class Session</span>
        </h1>
        <p className="text-muted-foreground mt-1">Select a student to view their class card</p>
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
          {/* Student selector grid */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`group rounded-2xl border p-4 text-left transition-all ${
                  selected?.id === s.id
                    ? "border-emerald-500/50 bg-emerald-500/10 glow-sm-emerald"
                    : "border-border/50 bg-card hover:border-border hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${
                    selected?.id === s.id
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-secondary text-muted-foreground group-hover:text-foreground"
                  }`}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.class_time || "No time set"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Class Card */}
          {selected && (
            <Card className="relative overflow-hidden max-w-2xl mx-auto glow-emerald">
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
                {/* Class Time - Large and prominent */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Class Time</p>
                    <p className="text-2xl font-bold text-amber-300">{selected.class_time || "Not set"}</p>
                  </div>
                </div>

                {/* Para Progress */}
                <div className="p-5 rounded-2xl bg-secondary/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-400" />
                      <span className="font-semibold text-sm">Quran Progress</span>
                    </div>
                    <span className="text-lg font-bold">
                      {selected.para_number ? (
                        <span>
                          Para <span className="text-emerald-400">{selected.para_number}</span> of 30
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </span>
                  </div>
                  {selected.para_number && (
                    <Progress value={(selected.para_number / 30) * 100} />
                  )}
                </div>

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
