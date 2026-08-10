"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { format } from "date-fns"
import { BookMarked, Check, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import {
  type Celebration,
  MemCelebration,
} from "@/components/memorization-celebration"
import {
  loadChunksFor,
  loadMemorizedChunkIds,
  type MemChunk,
  MemStudentLesson,
} from "@/components/memorization-chunks"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  type CelebratedState,
  celebrationStorageKey,
  chunkProgress,
  labelFor,
  type MemorizedChunkRef,
  pendingCelebrations,
  STUDENT_MEM_SELECT,
  type StudentMemItem,
} from "@/lib/memorization"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

function readCelebrated(studentId: string): CelebratedState | null {
  try {
    const raw = localStorage.getItem(celebrationStorageKey(studentId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CelebratedState>
    return { chunkIds: parsed.chunkIds ?? [], lessonIds: parsed.lessonIds ?? [] }
  } catch {
    // Unreadable or disabled storage just means we celebrate nothing this time,
    // which is far better than crashing the page a child came here to use.
    return null
  }
}

function writeCelebrated(studentId: string, state: CelebratedState) {
  try {
    localStorage.setItem(celebrationStorageKey(studentId), JSON.stringify(state))
  } catch {
    /* private mode / quota — nothing we can do, and nothing worth breaking for */
  }
}

/**
 * Turn the freshly loaded progress into the wins this student hasn't seen yet,
 * recording the new baseline as we go.
 */
function newCelebrations(
  studentId: string,
  items: StudentMemItem[],
  chunksByCatalog: Record<string, MemChunk[]>,
  memorizedIds: Set<string>,
): Celebration[] {
  const memorized: MemorizedChunkRef[] = []
  const completedLessonIds: string[] = []

  for (const item of items) {
    const chunks = chunksByCatalog[item.catalog_id] || []
    if (chunks.length === 0) continue
    for (const c of chunks) {
      if (memorizedIds.has(c.id)) memorized.push({ chunkId: c.id, catalogId: item.catalog_id })
    }
    if (chunkProgress(chunks, memorizedIds).isMemorized) completedLessonIds.push(item.catalog_id)
  }

  const { chunkIds, lessonIds, next } = pendingCelebrations(
    memorized,
    completedLessonIds,
    readCelebrated(studentId),
  )
  writeCelebrated(studentId, next)
  if (chunkIds.length === 0 && lessonIds.length === 0) return []

  const newChunks = new Set(chunkIds)
  const newLessons = new Set(lessonIds)
  const out: Celebration[] = []

  for (const item of items) {
    const chunks = chunksByCatalog[item.catalog_id] || []
    const title = item.memorization_catalog?.title || "Lesson"
    if (newLessons.has(item.catalog_id)) {
      out.push({
        kind: "lesson",
        id: item.catalog_id,
        title,
        imageUrl: item.memorization_catalog?.image_url ?? null,
        total: chunks.length,
      })
    }
    const { done, total } = chunkProgress(chunks, memorizedIds)
    chunks.forEach((c, i) => {
      if (!newChunks.has(c.id)) return
      out.push({
        kind: "part",
        id: c.id,
        label: labelFor(c, i),
        imageUrl: c.image_url,
        lessonTitle: title,
        done,
        total,
      })
    })
  }

  // A finished lesson goes first — the big moment shouldn't wait behind cheers.
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "lesson" ? -1 : 1))
}

export default function StudentMemorizationPage() {
  const { student, loading } = useStudent()
  const [items, setItems] = useState<StudentMemItem[]>([])
  const [chunksByItem, setChunksByItem] = useState<Record<string, MemChunk[]>>({})
  const [memorizedChunkIds, setMemorizedChunkIds] = useState<Set<string>>(new Set())
  const [loadingItems, setLoadingItems] = useState(true)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [expandedMemorized, setExpandedMemorized] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState<Celebration[]>([])
  const studentId = student?.id ?? null

  const load = useCallback(async () => {
    if (!studentId) return
    const { data } = await supabase
      .from("student_memorization")
      .select(STUDENT_MEM_SELECT)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
    const list = ((data as any) || []) as StudentMemItem[]
    const [chunks, memorizedIds] = await Promise.all([
      loadChunksFor(list.map((m) => m.catalog_id)),
      loadMemorizedChunkIds(studentId),
    ])
    setItems(list)
    setChunksByItem(chunks)
    setMemorizedChunkIds(memorizedIds)
    setLoadingItems(false)

    const fresh = newCelebrations(studentId, list, chunks, memorizedIds)
    if (fresh.length === 0) return
    setQueue((prev) => {
      const queued = new Set(prev.map((c) => c.id))
      return [...prev, ...fresh.filter((c) => !queued.has(c.id))]
    })
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  // Parts are marked by the teacher, so the win arrives from another device.
  // Without this the pill would just be quietly green on some later refresh.
  useEffect(() => {
    if (!studentId) return
    let t: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => void load(), 400)
    }
    const channel = supabase.channel(`mem-chunks:${studentId}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "student_memorization_chunks",
        filter: `student_id=eq.${studentId}`,
      },
      refresh,
    )
    // RLS on postgres_changes is evaluated with the user's JWT — attach it first.
    void supabase.realtime.setAuth().finally(() => channel.subscribe())
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [studentId, load])

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), [])

  // Deep link from Classes: /student/memorization#mem-<id>
  useEffect(() => {
    if (loadingItems) return
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const match = hash.match(/^#mem-(.+)$/)
    if (!match) return
    const id = match[1]
    const el = document.getElementById(`mem-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlightId(id)
    const t = setTimeout(() => setHighlightId(null), 2000)
    return () => clearTimeout(t)
  }, [loadingItems, items])

  if (loading || loadingItems) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="h-48 shimmer rounded-2xl" />
      </div>
    )
  }

  const memorizing = items.filter((m) => m.status === "memorizing")
  const memorized = items.filter((m) => m.status === "memorized")
  const celebration = queue[0] ?? null
  const celebratingId = celebration?.kind === "part" ? celebration.id : null

  function toggleExpanded(id: string) {
    setExpandedMemorized((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/20 text-sky-600 flex-shrink-0">
          <BookMarked className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Memorization
          </h1>
          <p className="text-sm text-muted-foreground">
            Surahs, duas and more you&apos;re learning
          </p>
        </div>
      </div>

      {memorizing.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Currently Memorizing
          </p>
          {memorizing.map((item) => {
            const chunks = chunksByItem[item.catalog_id] || []
            const title = item.memorization_catalog?.title || "Lesson"
            const progress = chunkProgress(chunks, memorizedChunkIds)
            return (
              <div
                key={item.id}
                id={`mem-${item.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-soft scroll-mt-24 transition-shadow",
                  highlightId === item.id &&
                    "ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.2)]",
                )}
              >
                <div className="flex items-center gap-3 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-transparent px-4 py-3">
                  {item.memorization_catalog?.image_url ? (
                    <img
                      src={item.memorization_catalog.image_url}
                      alt=""
                      className="h-11 w-11 rounded-xl border border-border bg-white object-contain p-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 flex-shrink-0">
                      <BookMarked className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-foreground">{title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border/40 text-muted-foreground"
                      >
                        {item.memorization_catalog?.category}
                      </Badge>
                      {chunks.length > 0 && (
                        <span className="text-[11px] font-semibold text-amber-600 tabular-nums">
                          {progress.done}/{progress.total} parts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {chunks.length > 0 ? (
                    <MemStudentLesson
                      chunks={chunks}
                      memorizedIds={memorizedChunkIds}
                      overviewUrl={item.memorization_catalog?.image_url}
                      title={title}
                      celebratingId={celebratingId}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Keep practicing — your teacher will mark this when you&apos;re ready.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {memorized.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="h-3 w-3" />
            Memorized ({memorized.length})
          </p>
          {memorized.map((item) => {
            const chunks = chunksByItem[item.catalog_id] || []
            const title = item.memorization_catalog?.title || "Lesson"
            const open = expandedMemorized.has(item.id)
            return (
              <div
                key={item.id}
                id={`mem-${item.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border/60 bg-card scroll-mt-24 transition-shadow",
                  highlightId === item.id &&
                    "ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.2)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => chunks.length > 0 && toggleExpanded(item.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  {item.memorization_catalog?.image_url ? (
                    <img
                      src={item.memorization_catalog.image_url}
                      alt=""
                      className="h-10 w-10 rounded-xl border border-border bg-white object-contain p-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 flex-shrink-0">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <Check className="h-3 w-3" />
                        Memorized
                      </span>
                      {item.last_revised_at && (
                        <span>Revised {format(new Date(item.last_revised_at), "MMM d")}</span>
                      )}
                      {chunks.length > 0 && (
                        <span className="text-muted-foreground/70">
                          {open ? "Hide parts" : "Show parts"}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {open && chunks.length > 0 && (
                  <div className="border-t border-border/50 px-4 py-4">
                    <MemStudentLesson
                      chunks={chunks}
                      memorizedIds={memorizedChunkIds}
                      overviewUrl={item.memorization_catalog?.image_url}
                      title={title}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookMarked className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Nothing assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Your teacher will assign memorization items here.
            </p>
          </CardContent>
        </Card>
      )}

      <MemCelebration current={celebration} onDismiss={dismissCelebration} />
    </div>
  )
}
