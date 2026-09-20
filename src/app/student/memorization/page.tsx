"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { format } from "date-fns"
import { useCallback, useEffect, useState } from "react"

import { KidCard, KidEmpty, KidPageHeader, KidStat } from "@/components/kid-ui"
import { type Celebration, MemCelebration } from "@/components/memorization-celebration"
import {
  loadChunksFor,
  loadMemorizedChunkIds,
  type MemChunk,
  MemStudentLesson,
} from "@/components/memorization-chunks"
import { PageLoading } from "@/components/page-loading"
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
import { ensureRealtimeAuth } from "@/lib/use-current-user"
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
    void ensureRealtimeAuth().finally(() => channel.subscribe())
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

  if (loading || loadingItems) return <PageLoading variant="student-simple" student />

  const memorizing = items.filter((m) => m.status === "memorizing")
  const memorized = items.filter((m) => m.status === "memorized")
  const revisionAssigned = memorized.filter((m) => m.revision_assigned_at)
  const revisionBucket = memorized.filter((m) => !m.revision_assigned_at)
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
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🧠"
        color="lavender"
        title="Memorize"
        subtitle="Surahs and duas you're learning by heart"
        right={
          items.length > 0 ? (
            <div className="flex w-full gap-2.5 sm:w-auto">
              <KidStat emoji="🌱" value={memorizing.length} label="Learning" color="lavender" />
              <KidStat
                emoji="🔁"
                value={revisionAssigned.length}
                label="Practise"
                color="saffron"
              />
              <KidStat emoji="✅" value={memorized.length} label="All done" color="sage" />
            </div>
          ) : undefined
        }
      />

      {revisionAssigned.length > 0 && (
        <section className="mb-8">
          <SectionTitle emoji="🔁" title="Practise again" count={revisionAssigned.length} />
          <div className="space-y-4">
            {revisionAssigned.map((item) => {
              const chunks = chunksByItem[item.catalog_id] || []
              const title = item.memorization_catalog?.title || "Lesson"
              return (
                <div
                  key={item.id}
                  id={`mem-${item.id}`}
                  className={cardShell(highlightId === item.id)}
                >
                  <KidCard color="saffron">
                    <div className="flex items-center gap-3.5">
                      <LessonAvatar
                        imageUrl={item.memorization_catalog?.image_url}
                        fallback="🔁"
                        color="saffron"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-[19px] font-bold leading-tight text-primary">
                          {title}
                        </p>
                        <p className="mt-0.5 text-[13.5px] font-semibold text-foreground/85">
                          Your teacher would like you to say this one again
                        </p>
                      </div>
                    </div>

                    {chunks.length > 0 && (
                      <div className="mt-4 border-t-[1.5px] border-[hsl(var(--kid-saffron)/0.35)] pt-4">
                        <MemStudentLesson
                          kid
                          chunks={chunks}
                          memorizedIds={memorizedChunkIds}
                          overviewUrl={item.memorization_catalog?.image_url}
                          title={title}
                        />
                      </div>
                    )}

                    {chunks.length === 0 && item.memorization_catalog?.image_url && (
                      <div className="mt-4 overflow-hidden rounded-[20px] border-[1.5px] border-border bg-white">
                        <img
                          src={item.memorization_catalog.image_url}
                          alt={title}
                          className="mx-auto max-h-64 w-full object-contain p-3"
                        />
                      </div>
                    )}
                  </KidCard>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {memorizing.length > 0 && (
        <section className="mb-8">
          <SectionTitle emoji="🌱" title="Learning now" count={memorizing.length} />
          <div className="space-y-4">
            {memorizing.map((item) => {
              const chunks = chunksByItem[item.catalog_id] || []
              const title = item.memorization_catalog?.title || "Lesson"
              const progress = chunkProgress(chunks, memorizedChunkIds)
              return (
                <div
                  key={item.id}
                  id={`mem-${item.id}`}
                  className={cardShell(highlightId === item.id)}
                >
                  <KidCard color="lavender">
                    <div className="flex items-center gap-3.5">
                      <LessonAvatar
                        imageUrl={item.memorization_catalog?.image_url}
                        fallback="🌱"
                        color="lavender"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-[20px] font-bold leading-tight text-primary">
                          {title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {item.memorization_catalog?.category && (
                            <span className="rounded-full bg-card/80 px-2.5 py-0.5 text-[12px] font-bold text-foreground">
                              {item.memorization_catalog.category}
                            </span>
                          )}
                          {chunks.length > 0 && (
                            <span className="text-[13px] font-bold tabular-nums text-foreground/85">
                              {progress.done} of {progress.total} parts done
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t-[1.5px] border-[hsl(var(--kid-lavender)/0.35)] pt-4">
                      {chunks.length > 0 ? (
                        <MemStudentLesson
                          kid
                          chunks={chunks}
                          memorizedIds={memorizedChunkIds}
                          overviewUrl={item.memorization_catalog?.image_url}
                          title={title}
                          celebratingId={celebratingId}
                        />
                      ) : (
                        <p className="text-[14px] font-semibold text-foreground/85">
                          🌟 Keep practising — your teacher will tick this off when you&apos;re
                          ready.
                        </p>
                      )}
                    </div>
                  </KidCard>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {revisionBucket.length > 0 && (
        <section className="mb-8">
          <SectionTitle emoji="✅" title="All done" count={revisionBucket.length} />
          <div className="space-y-3">
            {revisionBucket.map((item) => {
              const chunks = chunksByItem[item.catalog_id] || []
              const title = item.memorization_catalog?.title || "Lesson"
              const open = expandedMemorized.has(item.id)
              return (
                <div
                  key={item.id}
                  id={`mem-${item.id}`}
                  className={cardShell(highlightId === item.id)}
                >
                  <KidCard color="sage">
                    <button
                      type="button"
                      onClick={() => chunks.length > 0 && toggleExpanded(item.id)}
                      className="flex w-full items-center gap-3.5 text-left"
                    >
                      <LessonAvatar
                        imageUrl={item.memorization_catalog?.image_url}
                        fallback="✅"
                        color="sage"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-[19px] font-bold leading-tight text-primary">
                          {title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-foreground/85">
                          <span>🎉 Memorized</span>
                          {item.last_revised_at && (
                            <span>
                              Said again {format(new Date(item.last_revised_at), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      {chunks.length > 0 && (
                        <span className="flex-shrink-0 rounded-full border-[1.5px] border-[hsl(var(--kid-sage)/0.5)] bg-card/80 px-3 py-1 text-[12.5px] font-bold text-foreground">
                          {open ? "Hide parts" : "Show parts"}
                        </span>
                      )}
                    </button>

                    {open && chunks.length > 0 && (
                      <div className="mt-4 border-t-[1.5px] border-[hsl(var(--kid-sage)/0.35)] pt-4">
                        <MemStudentLesson
                          kid
                          chunks={chunks}
                          memorizedIds={memorizedChunkIds}
                          overviewUrl={item.memorization_catalog?.image_url}
                          title={title}
                        />
                      </div>
                    )}
                  </KidCard>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <KidEmpty
          title="Nothing to learn yet"
          text="When your teacher picks a surah or dua for you, it will pop up right here."
        />
      )}

      <MemCelebration current={celebration} onDismiss={dismissCelebration} />
    </div>
  )
}

/** Card wrapper: scroll anchor for the deep link from Classes, plus its flash. */
function cardShell(highlighted: boolean) {
  return cn(
    "scroll-mt-24 rounded-[26px] transition-shadow",
    highlighted && "ring-4 ring-[hsl(var(--kid-lavender)/0.55)]",
  )
}

/** Section heading: emoji, Baloo title, count pill (same shape as Quizzes). */
function SectionTitle({ emoji, title, count }: { emoji: string; title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="text-[22px] leading-none">
        {emoji}
      </span>
      <h2 className="font-heading text-[22px] font-bold text-primary">{title}</h2>
      <span className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-[12.5px] font-bold text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

/** The lesson's picture, or a crayon tile with an emoji when there isn't one. */
function LessonAvatar({
  imageUrl,
  fallback,
  color,
}: {
  imageUrl?: string | null
  fallback: string
  color: "sage" | "saffron" | "lavender"
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-12 w-12 flex-shrink-0 rounded-[16px] border-[1.5px] border-border bg-white object-contain p-1"
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px] border-[1.5px] text-[24px]",
        color === "sage" && "border-[hsl(var(--kid-sage)/0.5)] bg-[hsl(var(--kid-sage)/0.3)]",
        color === "saffron" &&
          "border-[hsl(var(--kid-saffron)/0.5)] bg-[hsl(var(--kid-saffron)/0.3)]",
        color === "lavender" &&
          "border-[hsl(var(--kid-lavender)/0.5)] bg-[hsl(var(--kid-lavender)/0.3)]",
      )}
    >
      {fallback}
    </span>
  )
}
