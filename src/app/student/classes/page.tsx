"use client"

import { useEffect, useState } from "react"
import { fetchAllRows } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, History } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

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

export default function StudentClassesPage() {
  const { student, loading } = useStudent()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    if (!student) return
    fetchAllRows<ClassSession>("class_sessions", (q) =>
      q.select("*").eq("student_id", student.id).order("started_at", { ascending: false })
    ).then((data) => {
      setSessions(data)
      setLoadingSessions(false)
    })
  }, [student])

  if (loading || loadingSessions) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-40 shimmer rounded-lg" />
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/20 text-violet-600 flex-shrink-0">
          <History className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">A record of your past class sessions.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-semibold mb-1">No sessions yet</p>
            <p className="text-sm text-muted-foreground">
              Sessions appear here after each class.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card px-5">
          {sessions.map((session, i) => (
            <div
              key={session.id}
              className={`flex items-center gap-3 py-3.5 ${
                i < sessions.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/50 flex-shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">
                    {format(new Date(session.started_at), "MMM d, yyyy")}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-border/50 text-muted-foreground">
                    {Math.floor(session.duration_seconds / 60)}m
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] mt-0.5 text-muted-foreground">
                  {session.paras_covered?.length > 0 && (
                    <span>Paras: {session.paras_covered.join(", ")}</span>
                  )}
                  {session.memorization_revised?.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{session.memorization_revised.length} revised</span>
                    </>
                  )}
                </div>
                {session.notes && (
                  <p className="text-xs mt-1 text-muted-foreground/70">{session.notes}</p>
                )}
              </div>
              <span className="text-[11px] flex-shrink-0 text-muted-foreground/60">
                {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
