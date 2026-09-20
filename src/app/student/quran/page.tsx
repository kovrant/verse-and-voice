"use client"

import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"

import { KidButton, KidCard, KidEmpty, KidPageHeader, QuranBookIcon } from "@/components/kid-ui"
import { InlineLoader, PageLoading } from "@/components/page-loading"
import { computeProgress, getStudentStage, type QuranRound } from "@/components/quran-progress"
import { StudentBackdrop } from "@/components/student-backdrop"
import { logActivity } from "@/lib/activity-log"
import { loadBookmark } from "@/lib/para-progress"
import { supabase } from "@/lib/supabase"
import type { PointerState } from "@/lib/use-class-channel"
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

type ParaState = "done" | "current" | "next" | "neutral"

export default function StudentQuranPage() {
  // useSearchParams (the ?para= deep link) needs a Suspense boundary, as on /login.
  return (
    <Suspense fallback={<PageLoading variant="grid-dense" student count={30} />}>
      <StudentQuranGrid />
    </Suspense>
  )
}

function StudentQuranGrid() {
  const searchParams = useSearchParams()
  const { student, loading: studentLoading, error } = useStudent()
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [media, setMedia] = useState<Record<number, ParaMedia>>({})
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const currentRef = useRef<HTMLButtonElement>(null)

  // In-app PDF reader: which para is open (null = showing the grid) + its page.
  const [viewing, setViewing] = useState<{ para: number; fileUrl: string } | null>(null)
  const [viewerPage, setViewerPage] = useState(1)
  const [bookmarkPointer, setBookmarkPointer] = useState<PointerState | null>(null)

  function openPara(para: number, fileUrl: string) {
    setViewerPage(1)
    setBookmarkPointer(null)
    setViewing({ para, fileUrl })
    if (student?.id) {
      loadBookmark(student.id, para).then((bm) => {
        if (bm.page > 1) setViewerPage(bm.page)
        if (typeof bm.line === "number") {
          setBookmarkPointer({
            x: bm.x ?? 0.5,
            y: bm.y ?? 0.5,
            line: bm.line,
          })
        }
      })
    }
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

  // Deep link: /student/quran?para=7 opens that para once its PDF is known.
  // Used by the stepping stones on My progress.
  const deepLinkedRef = useRef(false)
  useEffect(() => {
    if (deepLinkedRef.current || !mediaLoaded) return
    const wanted = Number(searchParams.get("para"))
    if (!wanted || wanted < 1 || wanted > 30) return
    const m = media[wanted]
    if (!m) return
    deepLinkedRef.current = true
    openPara(wanted, m.file_url)
  }, [mediaLoaded, media, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bring the current para into view once everything is loaded.
  useEffect(() => {
    if (mediaLoaded && currentPara && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [mediaLoaded, currentPara])

  if (studentLoading) return <PageLoading variant="grid-dense" student count={30} />

  if (error || !student) {
    return (
      <KidEmpty
        mood="sleepy"
        title="We couldn't load your profile"
        text={error || "Please ask your teacher for help."}
      />
    )
  }

  // One tap back into reading: the current para, or para 1 before any progress.
  const continuePara = currentPara ?? (prog.noProgress ? 1 : null)
  const continueMedia = continuePara ? media[continuePara] : undefined

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up text-foreground">
      <KidPageHeader
        emoji="📖"
        color="sage"
        title="Quran"
        subtitle="Tap a para to open it and start reading"
      />

      {/* Where am I + continue */}
      <KidCard color="sage" className="mb-7 flex flex-wrap items-center gap-4 sm:gap-6">
        <span
          aria-hidden
          className="flex h-[78px] w-[78px] flex-shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(hsl(var(--kid-sage)) ${pct}%, hsl(var(--kid-sage) / 0.22) 0)`,
          }}
        >
          <span className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-card">
            <span className="font-heading text-[26px] font-bold leading-none text-primary">
              {prog.allDone ? "🏆" : (continuePara ?? "–")}
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            {prog.allDone ? "MashaAllah!" : prog.noProgress ? "Start here" : "You're on"}
          </p>
          <p className="truncate font-heading text-[22px] font-bold leading-tight text-primary sm:text-[24px]">
            {prog.allDone
              ? "You finished the whole Quran"
              : continuePara
                ? `Para ${continuePara} · ${JUZ_NAMES[continuePara - 1]}`
                : "Pick a para to begin"}
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-2.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-[hsl(var(--kid-sage)/0.25)]">
              <div
                className="h-full rounded-full bg-[hsl(var(--kid-sage))]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[13px] font-bold text-muted-foreground">
              {totalDone} of 30 done
            </span>
          </div>
        </div>
        {continuePara && continueMedia && (
          <KidButton
            onClick={() => openPara(continuePara, continueMedia.file_url)}
            pad={<QuranBookIcon className="h-7 w-7" />}
            className="w-full sm:w-auto sm:px-8"
          >
            {prog.noProgress ? "Start reading" : "Continue reading"}
          </KidButton>
        )}
      </KidCard>

      {/* Para tiles */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 lg:grid-cols-6">
        {PARAS.map((n) => {
          const m = media[n]
          const available = !!m
          const state = paraState(n)
          const isCurrent = state === "current"
          const isDone = state === "done"

          return (
            <button
              key={n}
              type="button"
              onClick={available ? () => openPara(n, m.file_url) : undefined}
              disabled={!available}
              ref={isCurrent ? currentRef : undefined}
              title={`${JUZ_NAMES[n - 1]} — starts at ${JUZ_SURAHS[n - 1]}`}
              aria-label={
                available
                  ? `Open Para ${n} (${JUZ_NAMES[n - 1]})${isCurrent ? " — your current para" : isDone ? " — done" : ""}`
                  : `Para ${n} (${JUZ_NAMES[n - 1]}) — not uploaded yet`
              }
              className={cn(
                "relative flex flex-col items-center rounded-[22px] border-[1.5px] px-2 pb-3 pt-4 text-center transition-transform",
                available
                  ? "cursor-pointer hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
                  : "cursor-default border-dashed opacity-60",
                isCurrent
                  ? "border-accent shadow-[0_5px_0_hsl(16_48%_44%/0.7)] ring-4 ring-[hsl(var(--kid-coral)/0.2)]"
                  : isDone
                    ? "border-[hsl(var(--kid-sage)/0.5)] shadow-[0_4px_0_hsl(var(--kid-sage)/0.55)]"
                    : "border-border bg-card shadow-[0_4px_0_hsl(var(--border))]",
              )}
              style={
                isCurrent
                  ? {
                      background:
                        "linear-gradient(160deg, hsl(var(--kid-coral) / 0.28), hsl(var(--kid-coral) / 0.1)), hsl(var(--card))",
                    }
                  : isDone
                    ? {
                        background:
                          "linear-gradient(160deg, hsl(var(--kid-sage) / 0.28), hsl(var(--kid-sage) / 0.1)), hsl(var(--card))",
                      }
                    : undefined
              }
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent-foreground shadow-[0_2px_0_hsl(16_48%_40%)]">
                  You&apos;re here
                </span>
              )}
              {isDone && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                >
                  ✓
                </span>
              )}
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full font-heading text-[22px] font-bold",
                  isCurrent
                    ? "bg-accent text-accent-foreground"
                    : isDone
                      ? "bg-[hsl(var(--kid-sage)/0.45)] text-primary"
                      : "bg-secondary/60 text-muted-foreground",
                )}
              >
                {n}
              </span>
              <span
                className={cn(
                  "mt-2 line-clamp-2 text-[12.5px] font-bold leading-tight",
                  state === "next" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {JUZ_NAMES[n - 1]}
              </span>
              {!available && (
                <span className="mt-1 text-[11px] font-bold text-muted-foreground">Soon</span>
              )}
            </button>
          )
        })}
      </div>

      {/* In-app PDF reader (opens over the list; Back / Esc returns here) */}
      {viewing && (
        <div className="fixed inset-0 z-50 isolate flex flex-col">
          <StudentBackdrop />
          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4">
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
            >
              <ArrowLeft className="h-4 w-4" />
              All paras
            </button>
            <span className="inline-flex min-w-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm">
              <QuranBookIcon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate font-heading text-[16px] font-bold text-primary">
                Para {viewing.para}
                <span className="hidden text-[14px] font-semibold text-muted-foreground sm:inline">
                  {" "}
                  · {JUZ_NAMES[viewing.para - 1]}
                </span>
              </span>
            </span>
            {/* Spacer keeps the title centred against the back button on wide screens. */}
            <span className="hidden w-[124px] sm:block" />
          </div>
          <SyncedPdfViewer
            fileUrl={viewing.fileUrl}
            page={viewerPage}
            onPageChange={handleViewerPageChange}
            initialPointer={bookmarkPointer}
            allowPointing={false}
            kid
          />
        </div>
      )}
    </div>
  )
}
