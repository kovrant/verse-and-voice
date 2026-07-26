"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { format } from "date-fns"
import { BookMarked, Check, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import {
  loadChunksFor,
  loadMemorizedChunkIds,
  type MemChunk,
  MemStudentLesson,
} from "@/components/memorization-chunks"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { chunkProgress } from "@/lib/memorization"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

interface StudentMemItem {
  id: string
  catalog_id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: CatalogItem
}

export default function StudentMemorizationPage() {
  const { student, loading } = useStudent()
  const [items, setItems] = useState<StudentMemItem[]>([])
  const [chunksByItem, setChunksByItem] = useState<Record<string, MemChunk[]>>({})
  const [memorizedChunkIds, setMemorizedChunkIds] = useState<Set<string>>(new Set())
  const [loadingItems, setLoadingItems] = useState(true)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [expandedMemorized, setExpandedMemorized] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!student) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from("student_memorization")
        .select("*, memorization_catalog(id, title, category, image_url)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
      const list = ((data as any) || []) as StudentMemItem[]
      const [chunks, memorizedIds] = await Promise.all([
        loadChunksFor(list.map((m) => m.catalog_id)),
        loadMemorizedChunkIds(student.id),
      ])
      if (!active) return
      setItems(list)
      setChunksByItem(chunks)
      setMemorizedChunkIds(memorizedIds)
      setLoadingItems(false)
    })()
    return () => {
      active = false
    }
  }, [student])

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
    </div>
  )
}
