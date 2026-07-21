"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import {
  type QuranRound,
  getStudentStage,
  computeProgress,
  getChronologicalRoundNumber,
} from "@/components/quran-progress"
import { StudentParaPdf } from "@/components/student-para-pdf"
import { StudentMemorizationCard } from "@/components/student-memorization-card"

/** Bar heights for the 30-para tracker. */
const BAR_HEIGHTS = [
  56, 62, 50, 68, 58, 66, 54, 60, 64, 52, 66, 58, 70, 56, 62, 68, 54, 64, 60, 66,
  58, 52, 64, 44, 40, 42, 38, 44, 40, 46,
]

const QUICK_LINKS = [
  { href: "/student/progress", title: "My Progress", sub: "Quran & Qaida journey", icon: "📊" },
  { href: "/student/memorization", title: "Memorization", sub: "Surahs & duas", icon: "📖" },
  { href: "/student/classes", title: "Classes", sub: "Past sessions", icon: "📚" },
  { href: "/student/fees", title: "Fees", sub: "Payment status", icon: "💳" },
]

export default function StudentDashboardPage() {
  const { student, username, loading, error } = useStudent()
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
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in-up">
        <div className="h-11 w-64 shimmer rounded-xl" />
        <div className="h-80 shimmer rounded-2xl" />
        <div className="grid gap-[22px] sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🙈</div>
        <p className="mb-1 font-bold">We couldn&apos;t load your profile</p>
        <p className="text-sm text-muted-foreground">{error || "Please contact your teacher."}</p>
      </div>
    )
  }

  // ── Real progress data ──
  const stage = getStudentStage(rounds)
  const activeRound = stage.activeRound
  const desc = activeRound?.desc_completed || 0
  const asc = activeRound?.asc_completed || 0
  const { currentPara, total } = computeProgress(desc, asc)
  const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 1
  const done = total // paras memorized (0–30)
  const paraLabel = currentPara ?? done
  const pct = Math.round((done / 30) * 100)
  const initial = student.name.trim().charAt(0).toUpperCase() || "?"

  const paras = BAR_HEIGHTS.map((h, i) => {
    const n = i + 1
    const isDone = n <= done
    const isCurrent = done > 0 && n === done
    return {
      n,
      h: `${h}%`,
      bg: isDone ? "hsl(var(--primary))" : "hsl(var(--border))",
      shadow: isCurrent ? "0 4px 10px -3px hsl(var(--primary) / 0.55)" : "none",
    }
  })

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up text-foreground">
      {/* Greeting */}
      <div className="mb-[30px] flex items-center gap-5">
        <div className="flex h-[78px] w-[78px] flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-[38px]">
          🌙
        </div>
        <div>
          <div className="text-[18px] font-medium text-muted-foreground">Assalamu Alaikum</div>
          <div className="font-heading font-bold tracking-tight text-foreground" style={{ fontSize: "clamp(30px, 7vw, 40px)" }}>
            {student.name}
          </div>
        </div>
      </div>

      {/* Hero — My Quran Journey */}
      <div className="mb-[26px] rounded-2xl border border-border bg-[hsl(var(--surface-alt))] p-[26px_28px_30px]">
        <div className="mb-[22px] flex items-center gap-[9px]">
          <span className="text-[19px]">✨</span>
          <span className="font-heading text-[19px] font-bold text-foreground">My Quran Journey</span>
        </div>

        <div className="grid items-stretch gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
          {/* Student card */}
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-card p-[24px_22px_22px] shadow-soft">
            <div className="absolute inset-x-0 top-0 h-[92px] bg-secondary" />

            {/* Avatar with progress ring */}
            <div className="relative mt-[18px] h-[138px] w-[138px]">
              <div
                className="absolute rounded-full"
                style={{
                  inset: "-7px",
                  background: `conic-gradient(from -90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--border)) ${pct}%)`,
                }}
              />
              <div className="absolute inset-0 rounded-full bg-card" />
              <div className="absolute inset-[5px] flex items-center justify-center overflow-hidden rounded-full bg-secondary">
                <span className="font-heading text-foreground font-extrabold" style={{ fontSize: "74px", letterSpacing: "-2px" }}>
                  {initial}
                </span>
              </div>
              <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-card bg-primary px-[13px] py-[5px] text-[12px] font-bold text-primary-foreground">
                🏅 Round {roundNum}
              </div>
            </div>

            <div className="font-heading mt-[22px] text-[23px] font-bold text-foreground">{student.name}</div>
            <div className="mb-[16px] text-[13px] text-muted-foreground">@{username ?? "student"} · Age 9</div>

            {/* Mini stats */}
            <div className="flex w-full gap-[10px]">
              <div className="flex-1 rounded-xl bg-secondary p-[10px_6px] text-center">
                <div className="text-[19px] font-bold text-foreground">{done}</div>
                <div className="text-[11px] font-medium text-muted-foreground">Paras</div>
              </div>
              <div className="flex-1 rounded-xl bg-secondary p-[10px_6px] text-center">
                <div className="text-[19px] font-bold text-foreground">{stage.completedQuranCount}</div>
                <div className="text-[11px] font-medium text-muted-foreground">Rounds</div>
              </div>
              <div className="flex-1 rounded-xl bg-secondary p-[10px_6px] text-center">
                <div className="text-[19px] font-bold text-foreground">12</div>
                <div className="text-[11px] font-medium text-muted-foreground">Surahs</div>
              </div>
            </div>
          </div>

          {/* Progress panel */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-[26px_30px] shadow-soft">
            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[14px]">
              <div className="flex items-center gap-[14px]">
                <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-secondary text-[24px]">📖</div>
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground" style={{ letterSpacing: "1.4px" }}>QURAN PROGRESS</div>
                  <div className="font-heading text-[21px] font-bold text-foreground">Round {roundNum} · In progress</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-heading text-[34px] font-extrabold leading-none tracking-tight text-foreground">
                  Para {paraLabel}
                  <span className="text-[19px] font-semibold text-muted-foreground"> / 30</span>
                </div>
                <div className="mt-[4px] text-[13px] text-muted-foreground">{pct}% of the Quran</div>
              </div>
            </div>

            {/* Segmented para tracker */}
            <div className="mb-[12px] flex h-[66px] items-end gap-[4px]">
              {paras.map((p) => (
                <div key={p.n} title={`Para ${p.n}`} className="flex-1 rounded-[5px]" style={{ height: p.h, background: p.bg, boxShadow: p.shadow }} />
              ))}
            </div>
            <div className="mb-[20px] flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Para 1</span>
              <span>Para 30</span>
            </div>

            {/* Legend + streak */}
            <div className="mt-auto flex items-center justify-between border-t border-border pt-[18px]">
              <div className="flex gap-[18px]">
                <div className="flex items-center gap-[7px] text-[13px] font-medium text-muted-foreground">
                  <span className="h-[12px] w-[12px] rounded-[4px] bg-primary" />
                  {done} memorized
                </div>
                <div className="flex items-center gap-[7px] text-[13px] font-medium text-muted-foreground">
                  <span className="h-[12px] w-[12px] rounded-[4px] bg-border" />
                  {30 - done} to go
                </div>
              </div>
              <div className="flex items-center gap-[8px] rounded-full bg-secondary px-[15px] py-[8px] text-[13px] font-semibold text-foreground">
                🔥 12-day streak
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current para PDF + current memorization */}
      <div className="mb-[26px] grid items-stretch gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
        <StudentParaPdf paraNumber={paraLabel > 0 ? paraLabel : null} />
        <StudentMemorizationCard studentId={student.id} />
      </div>

      {/* Quick links */}
      <div className="grid gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center gap-[18px] rounded-2xl border border-border bg-card p-[22px_24px] shadow-soft transition-colors hover:border-[hsl(var(--border-strong))]"
          >
            <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-secondary text-[25px]">{l.icon}</div>
            <div className="flex-1">
              <div className="font-heading text-[19px] font-bold text-foreground">{l.title}</div>
              <div className="text-[14px] text-muted-foreground">{l.sub}</div>
            </div>
            <div className="text-[20px] text-muted-foreground/60 transition-transform group-hover:translate-x-0.5">→</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
