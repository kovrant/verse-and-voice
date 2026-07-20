"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { QuranProgress, type QuranRound } from "@/components/quran-progress"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, BookMarked, History, CreditCard, ArrowRight, Sparkles } from "lucide-react"

const QUICK_LINKS = [
  { href: "/student/progress", label: "My Progress", icon: BookOpen, desc: "Quran & Qaida journey", chip: "bg-emerald-400/20 text-emerald-600" },
  { href: "/student/memorization", label: "Memorization", icon: BookMarked, desc: "Surahs & duas", chip: "bg-sky-400/20 text-sky-600" },
  { href: "/student/classes", label: "Classes", icon: History, desc: "Past sessions", chip: "bg-violet-400/20 text-violet-600" },
  { href: "/student/fees", label: "Fees", icon: CreditCard, desc: "Payment status", chip: "bg-amber-400/25 text-amber-600" },
]

export default function StudentDashboardPage() {
  const { student, loading, error } = useStudent()
  const [rounds, setRounds] = useState<QuranRound[]>([])

  useEffect(() => {
    if (!student) return
    supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("started_at", { ascending: true })
      .then(({ data }) => setRounds((data as QuranRound[]) || []))
  }, [student])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        <div className="h-9 w-56 shimmer rounded-2xl" />
        <div className="h-64 shimmer rounded-[1.5rem]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-3">🙈</div>
            <p className="font-bold mb-1">We couldn&apos;t load your profile</p>
            <p className="text-sm text-muted-foreground">
              {error || "Please contact your teacher."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/15 text-3xl flex-shrink-0 animate-float">
          👋
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Assalamu Alaikum</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{student.name}</h1>
        </div>
      </div>

      {/* Progress hero */}
      <Card className="relative overflow-hidden border-2 border-primary/10">
        <div
          className="absolute inset-x-0 top-0 h-24 opacity-15"
          style={{ background: "linear-gradient(150deg, hsl(var(--c-a-500)), hsl(var(--primary)) 60%, hsl(var(--c-s-500)))" }}
        />
        <CardContent className="relative pt-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            My Quran Journey
          </div>
          <QuranProgress rounds={rounds} variant="full" />
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group hover-bounce border-2 border-transparent hover:border-primary/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0 transition-transform group-hover:scale-105 ${link.chip}`}>
                  <link.icon className="h-6 w-6" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
