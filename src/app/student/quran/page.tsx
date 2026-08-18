"use client"

import { ArrowLeft, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"

import { computeProgress, getStudentStage, type QuranRound } from "@/components/quran-progress"
import { InlineLoader, PageLoading } from "@/components/page-loading"
import { logActivity } from "@/lib/activity-log"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

// react-pdf renders client-side only.
const SyncedPdfViewer = dynamic(
  () => import("@/components/synced-pdf-viewer").then((m) => m.SyncedPdfViewer),
  {
    ssr: false,
    loading: () => <InlineLoader label="Opening para…" />,
  },
)

interface ParaMedia {
  title: string
  file_url: string
}

const PARAS = Array.from({ length: 30 }, (_, i) => i + 1)

// Traditional name of each juzʾ (its opening words).
const JUZ_NAMES = [
  "Alif Lām Mīm",
  "Sayaqūl",
  "Tilka ar-Rusul",
  "Lan Tanālū",
  "Wa al-Muḥṣanāt",
  "Lā Yuḥibbu Allāh",
  "Wa Idhā Samiʿū",
  "Wa Law Annanā",
  "Qāla al-Malaʾ",
  "Wa Aʿlamū",
  "Yaʿtadhirūn",
  "Wa Mā Min Dābbah",
  "Wa Mā Ubarriʾu",
  "Rubamā",
  "Subḥāna alladhī",
  "Qāla Alam",
  "Iqtaraba",
  "Qad Aflaḥa",
  "Wa Qāla alladhīna",
  "Amman Khalaqa",
  "Utlu Mā Ūḥiya",
  "Wa Man Yaqnut",
  "Wa Mā Liya",
  "Fa Man Aẓlamu",
  "Ilayhi Yuraddu",
  "Ḥā Mīm",
  "Qāla Fa Mā Khaṭbukum",
  "Qad Samiʿa",
  "Tabāraka alladhī",
  "ʿAmma",
]

// Surah (and āyah) each juzʾ opens on.
const JUZ_SURAHS = [
  "Al-Fātiḥah 1",
  "Al-Baqarah 142",
  "Al-Baqarah 253",
  "Āl ʿImrān 93",
  "An-Nisāʾ 24",
  "An-Nisāʾ 148",
  "Al-Māʾidah 82",
  "Al-Anʿām 111",
  "Al-Aʿrāf 88",
  "Al-Anfāl 41",
  "At-Tawbah 93",
  "Hūd 6",
  "Yūsuf 53",
  "Al-Ḥijr 1",
  "Al-Isrāʾ 1",
  "Al-Kahf 75",
  "Al-Anbiyāʾ 1",
  "Al-Muʾminūn 1",
  "Al-Furqān 21",
  "An-Naml 56",
  "Al-ʿAnkabūt 46",
  "Al-Aḥzāb 31",
  "Yā Sīn 28",
  "Az-Zumar 32",
  "Fuṣṣilat 47",
  "Al-Aḥqāf 1",
  "Adh-Dhāriyāt 31",
  "Al-Mujādilah 1",
  "Al-Mulk 1",
  "An-Nabaʾ 1",
]

// Verse & Voice teal — used to make completed ticks and the current-para badge pop.
const ACCENT = "#37beae"
const ACCENT_DIM = "rgba(55, 190, 174, 0.16)"
const ACCENT_BORDER = "rgba(55, 190, 174, 0.5)"

type ParaState = "done" | "current" | "next" | "neutral"

export default function StudentQuranPage() {
  const { student, loading: studentLoading, error } = useStudent()
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [media, setMedia] = useState<Record<number, ParaMedia>>({})
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const currentRef = useRef<HTMLButtonElement>(null)

  // In-app PDF reader: which para is open (null = showing the grid) + its page.
  const [viewing, setViewing] = useState<{ para: number; fileUrl: string } | null>(null)
  const [viewerPage, setViewerPage] = useState(1)

  function openPara(para: number, fileUrl: string) {
    setViewerPage(1)
    setViewing({ para, fileUrl })
    logActivity({
      event_type: "para_open",
      label: `Para ${para} — ${JUZ_NAMES[para - 1]}`,
      href: fileUrl,
      meta: { para_number: para, juz_name: JUZ_NAMES[para - 1] },
    })
  }

  // Log page turns inside the in-app PDF reader (which para + which page).
  function handleViewerPageChange(nextPage: number) {
    setViewerPage(nextPage)
    if (viewing) {
      logActivity({
        event_type: "pdf_page",
        label: `Para ${viewing.para} — page ${nextPage}`,
        meta: { para_number: viewing.para, page: nextPage },
      })
    }
  }

  // Esc closes the reader and returns to the paras list.
  useEffect(() => {
    if (!viewing) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewing(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewing])

  // This student's rounds — to know which para they're currently on.
  useEffect(() => {
    if (!student) return
    supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("started_at", { ascending: true })
      .then(({ data }) => setRounds((data as QuranRound[]) || []))
  }, [student])

  // All Quran para PDFs from the shared media library (type=quran, meta.para_number).
  useEffect(() => {
    let active = true
    supabase
      .from("media_library")
      .select("title, file_url, meta")
      .eq("type", "quran")
      .then(({ data }) => {
        if (!active) return
        const map: Record<number, ParaMedia> = {}
        for (const row of (data || []) as {
          title: string
          file_url: string
          meta?: { para_number?: number }
        }[]) {
          const n = Number(row.meta?.para_number)
          if (n >= 1 && n <= 30) map[n] = { title: row.title, file_url: row.file_url }
        }
        setMedia(map)
        setMediaLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Real progress from Mahad's records. Paras can be completed from BOTH ends:
  // asc_completed = how far in from para 1 (paras 1..asc-1 done, asc is current),
  // desc_completed = how many paras done from the end (paras 31-desc..30 done).
  const prog = useMemo(() => {
    const { activeRound, completedQuranCount } = getStudentStage(rounds)
    const asc = activeRound?.asc_completed || 0
    const desc = activeRound?.desc_completed || 0
    const { currentPara, total, isCompleted } = computeProgress(desc, asc)
    const allDone = isCompleted || (!activeRound && completedQuranCount > 0)
    const noProgress = !allDone && total === 0 && currentPara == null
    return { asc, desc, currentPara, total, allDone, noProgress }
  }, [rounds])

  const currentPara = prog.allDone ? null : prog.currentPara
  const totalDone = prog.allDone ? 30 : prog.total
  const pct = Math.round((totalDone / 30) * 100)

  function paraState(n: number): ParaState {
    if (prog.noProgress) return "neutral"
    if (prog.allDone) return "done"
    if (currentPara != null && n === currentPara) return "current"
    const doneFromStart = prog.asc > 0 && n < prog.asc
    const doneFromEnd = prog.desc > 0 && n > 30 - prog.desc
    return doneFromStart || doneFromEnd ? "done" : "next"
  }

  // Bring the current para into view once everything is loaded.
  useEffect(() => {
    if (mediaLoaded && currentPara && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [mediaLoaded, currentPara])

  if (studentLoading) return <PageLoading variant="grid-dense" student count={30} />

  if (error || !student) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🙈</div>
        <p className="mb-1 font-bold">We couldn&apos;t load your profile</p>
        <p className="text-sm text-muted-foreground">{error || "Please contact your teacher."}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up text-foreground">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <span className="h-px w-6 bg-[hsl(var(--border-strong))]" />
            Recitation Library
          </div>
          <h1
            className="font-heading font-bold leading-none tracking-tight text-foreground"
            style={{ fontSize: "clamp(30px, 6vw, 52px)" }}
          >
            Quran
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
            All thirty ajzāʾ of the Muṣḥaf. Tap a para to open its PDF, review its opening surah, or
            pick up where you left off.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3.5 sm:items-end">
          {currentPara && (
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[hsl(var(--border-strong))] bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Currently on Para {currentPara}
            </div>
          )}
          <div className="flex w-[260px] max-w-full flex-col gap-2">
            <div className="flex justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{totalDone} / 30 completed</span>
              <span className="text-foreground">{pct}%</span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-full border border-border bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Para grid */}
      <div
        className="mt-11 grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(196px, 1fr))" }}
      >
        {PARAS.map((n) => {
          const m = media[n]
          const available = !!m
          const state = paraState(n)
          const isCurrent = state === "current"

          const tone =
            state === "current"
              ? "border-primary bg-secondary ring-2 ring-primary shadow-soft"
              : state === "next"
                ? "border-border bg-card opacity-70 hover:opacity-100"
                : "border-border bg-card"

          return (
            <button
              key={n}
              type="button"
              onClick={available ? () => openPara(n, m.file_url) : undefined}
              disabled={!available}
              ref={isCurrent ? currentRef : undefined}
              aria-label={
                available
                  ? `Open Para ${n} (${JUZ_NAMES[n - 1]}) PDF${isCurrent ? " — your current para" : ""}`
                  : `Para ${n} (${JUZ_NAMES[n - 1]}) — not uploaded yet`
              }
              className={cn(
                "group flex min-h-[196px] flex-col rounded-2xl border p-5 text-left transition-all",
                tone,
                available
                  ? "cursor-pointer hover:-translate-y-0.5 hover:border-[hsl(var(--border-strong))]"
                  : "cursor-default",
              )}
            >
              {/* Top row: para label + state badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Para {String(n).padStart(2, "0")}
                </span>
                {state === "current" ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ background: ACCENT, color: "#04181b" }}
                  >
                    You&apos;re here
                  </span>
                ) : state === "done" ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      color: ACCENT,
                      background: ACCENT_DIM,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    ✓
                  </span>
                ) : null}
              </div>

              {/* Number + juzʾ name */}
              <div className="mt-3.5">
                <span
                  className={cn(
                    "font-heading text-[46px] font-extrabold leading-none tracking-tight",
                    state === "current"
                      ? "text-primary"
                      : state === "next"
                        ? "text-muted-foreground"
                        : "text-foreground",
                  )}
                >
                  {n}
                </span>
              </div>
              <div className="mt-1.5 text-[14.5px] font-semibold leading-tight text-muted-foreground">
                {JUZ_NAMES[n - 1]}
              </div>

              {/* Footer: opening surah + open/unavailable affordance */}
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
                <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {JUZ_SURAHS[n - 1]}
                </span>
                {available ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold tracking-wide text-foreground">
                    Open PDF ↗
                  </span>
                ) : (
                  <span className="shrink-0 text-[10.5px] font-medium tracking-wide text-muted-foreground/60">
                    Not uploaded
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* In-app PDF reader (opens over the list; Back / Esc returns here) */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              All paras
            </button>
            <span className="truncate text-sm font-semibold text-foreground">
              Para {viewing.para}
              <span className="text-muted-foreground"> · {JUZ_NAMES[viewing.para - 1]}</span>
            </span>
            {/* Spacer to keep the title centered against the back button. */}
            <span className="hidden w-[104px] sm:block" />
          </div>
          <SyncedPdfViewer
            fileUrl={viewing.fileUrl}
            page={viewerPage}
            onPageChange={handleViewerPageChange}
          />
        </div>
      )}
    </div>
  )
}
