"use client"

import { BookMarked, BookOpen } from "lucide-react"
import { useEffect, useState } from "react"

import { getDashboardProgress, type QuranRound } from "@/components/quran-progress"
import { PageLoading } from "@/components/page-loading"
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
 * The huroof mufradah of the Norani Qaida's first lesson, in the book's order —
 * 29, which counts hamza separately from alif. Rendered RTL so the chart reads
 * the way it does on the page.
 */
const QAIDA_LETTERS = [
  "ا",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ء",
  "ي",
]

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

function JourneyPath({
  done,
  total = 30,
  tall = false,
}: {
  done: number
  total?: number
  tall?: boolean
}) {
  const ns = journeyStops(done, total)

  // Lay the stops out evenly across the canvas with an alternating (wave) y.
  // `tall` scales the whole drawing — beads, type and wave depth together — so
  // on a portrait tablet it fills its panel instead of floating in the middle
  // of it. Scaling everything (rather than just deepening the wave) keeps the
  // path gentle and makes the labels easier to read at that size.
  const W = 1010
  const H = tall ? 340 : 176
  const [yTop, yBottom] = tall ? [120, 220] : [68, 122]
  const s = tall ? 1.4 : 1
  const MX = 70
  const step = ns.length > 1 ? (W - MX * 2) / (ns.length - 1) : 0
  const nodes = ns.map((n, i) => ({ n, x: MX + i * step, y: i % 2 === 0 ? yTop : yBottom }))

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
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden>
      <path
        d={thru(remPts)}
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth={7 * s}
        strokeLinecap="round"
      />
      <path
        d={thru(donePts)}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={7 * s}
        strokeLinecap="round"
      />
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
                r={21 * s}
                fill={reached ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                stroke={reached ? "hsl(var(--primary))" : "hsl(var(--taupe))"}
                strokeWidth={2 * s}
                strokeDasharray={reached ? undefined : `${4 * s} ${3 * s}`}
              />
              <text x={p.x} y={p.y + 5 * s} textAnchor="middle" fontSize={16 * s}>
                🏆
              </text>
              <text
                x={p.x}
                y={p.y + 42 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={700}
                fill="hsl(var(--muted-foreground))"
              >
                Finish
              </text>
            </g>
          )
        }

        if (isCurrent)
          return (
            <g key={`cur-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={30 * s} fill="hsl(var(--sage) / 0.28)" />
              <circle
                cx={p.x}
                cy={p.y}
                r={22 * s}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--sage))"
                strokeWidth={3 * s}
              />
              <g transform={`translate(${p.x - 9 * s},${p.y - 9 * s})`}>
                <BookOpen size={18 * s} color="hsl(var(--primary-foreground))" />
              </g>
              <text
                x={p.x}
                y={p.y + 46 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={800}
                fill="hsl(var(--primary))"
              >
                You are here
              </text>
            </g>
          )

        if (isDone)
          return (
            <g key={`done-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={19 * s} fill="hsl(var(--primary))" />
              <path
                d={`M${p.x - 6 * s} ${p.y} l${4 * s} ${4 * s} l${8 * s} ${-8 * s}`}
                fill="none"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={3 * s}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={p.x}
                y={p.y + 40 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={700}
                fill="hsl(var(--muted-foreground))"
              >
                Para {p.n}
              </text>
            </g>
          )

        return (
          <g key={`todo-${p.n}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={19 * s}
              fill="hsl(var(--card))"
              stroke="hsl(var(--secondary))"
              strokeWidth={2 * s}
            />
            <text
              x={p.x}
              y={p.y + 5 * s}
              textAnchor="middle"
              className="font-heading"
              fontSize={15 * s}
              fontWeight={700}
              fill="hsl(var(--muted-foreground))"
            >
              {p.n}
            </text>
            <text
              x={p.x}
              y={p.y + 40 * s}
              textAnchor="middle"
              fontSize={12 * s}
              fontWeight={700}
              fill="hsl(var(--muted-foreground))"
            >
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

  if (loading) return <PageLoading variant="student-home" student />

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
  const { isQaida, allQuranDone, khatms, roundNum, paraLabel, heroPara, heroTotal } =
    getDashboardProgress(rounds)
  const pct = Math.round((heroTotal / 30) * 100)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col animate-fade-in-up text-foreground">
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

      {/* Quran progress + winding journey path. Sized by its content: on tall
          viewports the path itself scales up, so the card grows without ever
          leaving a gap around the drawing. */}
      <div className="mb-[26px] shrink-0 rounded-2xl border border-border bg-card p-[24px_26px] shadow-soft">
        <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[14px]">
          <div className="flex items-center gap-[14px]">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-secondary text-[24px]">
              {isQaida ? <BookMarked className="h-6 w-6 text-muted-foreground" /> : "📖"}
            </div>
            <div>
              <div
                className="text-[12px] font-semibold text-muted-foreground"
                style={{ letterSpacing: "1.4px" }}
              >
                {isQaida ? "LEARNING STAGE" : "QURAN PROGRESS"}
              </div>
              <div className="font-heading text-[21px] font-bold text-foreground">
                {isQaida
                  ? "Norani Qaida · In progress"
                  : allQuranDone
                    ? `Quran complete · ${khatms}× khatm`
                    : `Round ${roundNum} · In progress`}
              </div>
            </div>
          </div>
          {isQaida ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--surface-alt))] px-[12px] py-[6px] text-[12.5px] font-extrabold text-[hsl(var(--sage))]">
              <span className="h-[7px] w-[7px] rounded-full bg-[hsl(var(--sage))]" />
              Learning the basics
            </span>
          ) : (
            <div className="text-right">
              <div className="font-heading text-[34px] font-extrabold leading-none tracking-tight text-foreground">
                Para {heroPara}
                <span className="text-[19px] font-semibold text-muted-foreground"> / 30</span>
              </div>
              <div className="mt-[4px] text-[13px] text-muted-foreground">{pct}% of the Quran</div>
            </div>
          )}
        </div>

        {isQaida ? (
          /* Qaida has no per-para progress to draw, so the panel shows what the
             student is actually learning — the letters — instead of an empty
             30-para journey. Column count is capped rather than fluid: 10 wide
             cells would be huge on a desktop panel and unreadable on a phone. */
          <div className="rounded-2xl bg-[hsl(var(--surface-alt))] p-[18px_20px]">
            <div className="mb-[14px] flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-extrabold tracking-[1.2px] text-muted-foreground">
                THE LETTERS YOU ARE LEARNING
              </div>
              <span className="text-[12.5px] font-semibold text-muted-foreground">
                {QAIDA_LETTERS.length} huroof
              </span>
            </div>
            <div
              dir="rtl"
              role="img"
              aria-label={`The ${QAIDA_LETTERS.length} letters of the Norani Qaida`}
              className="mx-auto grid max-w-[560px] grid-cols-6 gap-[6px] sm:grid-cols-10 tall:max-w-[680px]"
            >
              {QAIDA_LETTERS.map((letter) => (
                <span
                  key={letter}
                  aria-hidden
                  className="flex aspect-square items-center justify-center rounded-[10px] border border-border bg-card font-arabic text-[20px] leading-none text-foreground tall:text-[24px]"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="mt-[16px] text-[13px] text-muted-foreground">
              Learning the letters, sounds and rules of the Norani Qaida. Your 30-para Quran journey
              begins once you finish it.
            </p>
          </div>
        ) : (
          /* Winding journey path */
          <div className="overflow-x-auto rounded-2xl bg-[hsl(var(--surface-alt))] px-4 pb-2 pt-4">
            {/* Swapped by CSS rather than a JS media query so the right size is
                there on first paint. The wrapper carries the single accessible
                name; both drawings are hidden from assistive tech. */}
            <div
              className="min-w-[520px]"
              role="img"
              aria-label={`Quran journey — para ${heroPara} of 30`}
            >
              <div className="tall:hidden">
                <JourneyPath done={heroPara} total={30} />
              </div>
              <div className="hidden tall:block">
                <JourneyPath done={heroPara} total={30} tall />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current para PDF + current memorization. These take the leftover
          height. The cap needs both conditions: only tall viewports have slack
          to give, and below lg the cards stack, where a max-h would clip the
          second one. */}
      <div
        className="grid shrink-0 grow items-stretch gap-[20px] tall:lg:max-h-[460px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
      >
        <StudentParaPdf paraNumber={paraLabel > 0 ? paraLabel : null} />
        <StudentMemorizationCard studentId={student.id} />
      </div>
    </div>
  )
}
