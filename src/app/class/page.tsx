"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuranProgress } from "@/components/quran-progress"
import { Clock, User, Users, Sparkles, CalendarDays, BookMarked, Check, RotateCcw, Shuffle } from "lucide-react"
import { differenceInDays, format, differenceInCalendarDays } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  is_qaida: boolean
  desc_completed: number
  asc_completed: number
  class_time: string | null
}

interface MemItem {
  id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: { id: string; title: string; category: string; image_url: string | null }
}

export default function ClassPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [memItems, setMemItems] = useState<MemItem[]>([])
  const [revisionPick, setRevisionPick] = useState<MemItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, name, guardian_name, started_at, is_qaida, desc_completed, asc_completed, class_time")
      .eq("status", "Reading")
      .order("name")
    setStudents(data || [])
    setLoading(false)
  }

  async function handleSelect(studentId: string) {
    const student = students.find((s) => s.id === studentId) || null
    setSelected(student)
    setRevisionPick(null)
    if (student) {
      const { data } = await supabase
        .from("student_memorization")
        .select("id, status, last_revised_at, memorization_catalog(id, title, category, image_url)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
      setMemItems((data as any) || [])
    } else {
      setMemItems([])
    }
  }

  function pickRevision() {
    const memorized = memItems.filter(m => m.status === "memorized")
    if (memorized.length === 0) return

    // Pick the one least recently revised
    const sorted = [...memorized].sort((a, b) => {
      const aTime = a.last_revised_at ? new Date(a.last_revised_at).getTime() : 0
      const bTime = b.last_revised_at ? new Date(b.last_revised_at).getTime() : 0
      return aTime - bTime
    })
    setRevisionPick(sorted[0])
  }

  async function markRevised(id: string) {
    await supabase
      .from("student_memorization")
      .update({ last_revised_at: new Date().toISOString() })
      .eq("id", id)

    if (selected) {
      const { data } = await supabase
        .from("student_memorization")
        .select("id, status, last_revised_at, memorization_catalog(id, title, category, image_url)")
        .eq("student_id", selected.id)
        .order("created_at", { ascending: false })
      setMemItems((data as any) || [])
    }
    setRevisionPick(null)
  }

  const memorizing = memItems.filter(m => m.status === "memorizing")
  const memorized = memItems.filter(m => m.status === "memorized")

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

          {selected && (
            <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
              {/* Main Class Card */}
              <Card className="relative overflow-hidden glow-emerald">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

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

              {/* Memorization Section */}
              {memItems.length > 0 && (
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-amber-400" />
                      <CardTitle>Memorization</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Currently memorizing */}
                    {memorizing.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Currently Memorizing
                        </p>
                        {memorizing.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                            {item.memorization_catalog?.image_url && (
                              <img src={item.memorization_catalog.image_url} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <p className="text-base font-semibold text-amber-300">{item.memorization_catalog?.title}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Already memorized */}
                    {memorized.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Check className="h-3 w-3" />
                          Memorized ({memorized.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {memorized.map((item) => (
                            <Badge key={item.id} variant="outline" className="border-border/50 text-muted-foreground text-xs py-1 px-2.5">
                              {item.memorization_catalog?.title}
                              {item.last_revised_at && (
                                <span className="text-muted-foreground/40 ml-1">
                                  &middot; {format(new Date(item.last_revised_at), "MMM d")}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weekly revision picker */}
                    {memorized.length > 0 && (
                      <div className="pt-3 border-t border-border/50">
                        {revisionPick ? (
                          <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-amber-400" />
                              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                                Revision Pick
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              {revisionPick.memorization_catalog?.image_url && (
                                <img src={revisionPick.memorization_catalog.image_url} alt="" className="h-16 w-16 rounded-xl object-cover flex-shrink-0 border border-amber-500/20" />
                              )}
                              <p className="text-xl font-bold text-amber-300">{revisionPick.memorization_catalog?.title}</p>
                            </div>
                            {revisionPick.last_revised_at && (
                              <p className="text-xs text-muted-foreground">
                                Last revised: {format(new Date(revisionPick.last_revised_at), "MMM d, yyyy")}
                                {" "}({differenceInCalendarDays(new Date(), new Date(revisionPick.last_revised_at))} days ago)
                              </p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => markRevised(revisionPick.id)}>
                                <Check className="h-3 w-3 mr-1" />
                                Mark Revised
                              </Button>
                              <Button size="sm" variant="outline" onClick={pickRevision}>
                                <Shuffle className="h-3 w-3 mr-1" />
                                Pick Another
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" onClick={pickRevision} className="w-full">
                            <Shuffle className="h-4 w-4 mr-2" />
                            Pick a Revision Item
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
