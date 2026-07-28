"use client"

import { BookOpen } from "lucide-react"
import { useEffect, useState } from "react"

import {
  computeProgress,
  getChronologicalRoundNumber,
  getStudentStage,
  type QuranRound,
} from "@/components/quran-progress"
import { StudentMemorizationCard } from "@/components/student-memorization-card"
import { StudentParaPdf } from "@/components/student-para-pdf"
import { StudentStreakCard } from "@/components/student-streak-card"
import { journeyStops } from "@/lib/journey"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

/**
 * Winding "journey" path through the 30 paras. `done` is the student's current
 * position (para they're on); nodes before it read as completed, the node at it
 * is "You are here", and the rest are upcoming milestones ending in a trophy.
 */
/**
 * Tasbih (prayer beads) mark for the greeting tile — an inline SVG so it always
 * renders, unlike the 📿 emoji which is missing from many system fonts.
 */
function TasbihIcon({ className }: { className?: string }) {
  const cx = 12
  const cy = 10.2
  const r = 6.3
  const count = 9
  const gap = 60 // open degrees at the bottom, where the tassel hangs
  const span = 360 - gap
  const start = 270 + gap / 2
  const beads = Array.from({ length: count }, (_, i) => {
    const a = ((start + (span * i) / (count - 1)) * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  })
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      {beads.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={1.5} />
      ))}
      {/* Imam bead + tassel */}
      <path d="M10.5 15.3 H13.5" />
      <path d="M10.6 15.4 C10.9 18.2 13.1 18.2 13.4 15.4" />
    </svg>
  )
}

function JourneyPath({ done, total = 30 }: { done: number; total?: number }) {
  const ns = journeyStops(done, total)

  // Lay the stops out evenly across the canvas with an alternating (wave) y.
  const W = 1010
  const H = 176
  const MX = 70
  const step = ns.length > 1 ? (W - MX * 2) / (ns.length - 1) : 0
  const nodes = ns.map((n, i) => ({ n, x: MX + i * step, y: i % 2 === 0 ? 68 : 122 }))

  const thru = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return ""
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const dx = (b.x - a.x) * 0.5
      d += ` C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`
    }
    return d
  }
  const donePts = nodes.filter((p) => p.n <= done)
  const remPts = nodes.filter((p) => p.n >= done)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Quran journey">
      <path d={thru(remPts)} fill="none" stroke="hsl(var(--secondary))" strokeWidth={7} strokeLinecap="round" />
      <path d={thru(donePts)} fill="none" stroke="hsl(var(--primary))" strokeWidth={7} strokeLinecap="round" />
      {nodes.map((p) => {
        const isFinish = p.n === total
        const isCurrent = p.n === done && !isFinish
        const isDone = p.n < done

        // Finish trophy — filled once the whole Quran is done, dashed otherwise.
        if (isFinish) {
          const reached = done >= total
          return (
            <g key={`fin-${p.n}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={21}
                fill={reached ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                stroke={reached ? "hsl(var(--primary))" : "hsl(var(--taupe))"}
                strokeWidth={2}
                strokeDasharray={reached ? undefined : "4 3"}
              />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={16}>
                🏆
              </text>
              <text x={p.x} y={p.y + 42} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--muted-foreground))">
                Finish
              </text>
            </g>
          )
        }

        if (isCurrent)
          return (
            <g key={`cur-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={30} fill="hsl(var(--sage) / 0.28)" />
              <circle cx={p.x} cy={p.y} r={22} fill="hsl(var(--primary))" stroke="hsl(var(--sage))" strokeWidth={3} />
              <g transform={`translate(${p.x - 9},${p.y - 9})`}>
                <BookOpen size={18} color="hsl(var(--primary-foreground))" />
              </g>
              <text x={p.x} y={p.y + 46} textAnchor="middle" fontSize={12} fontWeight={800} fill="hsl(var(--primary))">
                You are here
              </text>
            </g>
          )

        if (isDone)
          return (
            <g key={`done-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={19} fill="hsl(var(--primary))" />
              <path
                d={`M${p.x - 6} ${p.y} l4 4 l8 -8`}
                fill="none"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={p.x} y={p.y + 40} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--muted-foreground))">
                Para {p.n}
              </text>
            </g>
          )

        return (
          <g key={`todo-${p.n}`}>
            <circle cx={p.x} cy={p.y} r={19} fill="hsl(var(--card))" stroke="hsl(var(--secondary))" strokeWidth={2} />
            <text
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
              className="font-heading"
              fontSize={15}
              fontWeight={700}
              fill="hsl(var(--muted-foreground))"
            >
              {p.n}
            </text>
            <text x={p.x} y={p.y + 40} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--muted-foreground))">
              Para {p.n}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

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

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up text-foreground">
      {/* Greeting */}
      <div className="mb-[30px] flex items-center gap-5">
        <div className="flex h-[78px] w-[78px] flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <TasbihIcon className="h-11 w-11" />
        </div>
        <div>
          <div className="text-[18px] font-medium text-muted-foreground">Assalamu Alaikum</div>
          <div
            className="font-heading font-bold tracking-tight text-foreground"
            style={{ fontSize: "clamp(30px, 7vw, 40px)" }}
          >
            {student.name}
          </div>
        </div>
      </div>

      {/* Daily streak — hidden until teacher sets class_days */}
      <StudentStreakCard
        studentId={student.id}
        classDays={student.class_days}
        classTime={student.class_time}
        variant="hero"
      />

      {/* Quran progress + winding journey path */}
      <div className="mb-[26px] rounded-2xl border border-border bg-card p-[24px_26px] shadow-soft">
        <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[14px]">
          <div className="flex items-center gap-[14px]">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-secondary text-[24px]">
              📖
            </div>
            <div>
              <div
                className="text-[12px] font-semibold text-muted-foreground"
                style={{ letterSpacing: "1.4px" }}
              >
                QURAN PROGRESS
              </div>
              <div className="font-heading text-[21px] font-bold text-foreground">
                Round {roundNum} · In progress
              </div>
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

        {/* Winding journey path */}
        <div className="overflow-x-auto rounded-2xl bg-[hsl(var(--surface-alt))] px-4 pb-2 pt-4">
          <div className="min-w-[520px]">
            <JourneyPath done={paraLabel} total={30} />
          </div>
        </div>
      </div>

      {/* Current para PDF + current memorization */}
      <div
        className="grid items-stretch gap-[20px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
      >
        <StudentParaPdf paraNumber={paraLabel > 0 ? paraLabel : null} />
        <StudentMemorizationCard studentId={student.id} />
      </div>
    </div>
  )
}
