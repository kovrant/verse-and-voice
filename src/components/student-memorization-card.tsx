"use client"

import { ArrowRight, BookOpen, Sprout } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

interface CurrentMem {
  title: string
  /** Memorized chunks ("parts") and total chunks for the current item. */
  done: number
  total: number
}

/**
 * Dashboard "Now Memorizing" card — the student's current in-progress item with
 * its per-part (chunk) progress ring. Progress is real: memorized chunks vs the
 * item's total chunks (see migration_memorization_chunks). Items without chunks
 * fall back to a chunk-less "in progress" state.
 */
export function StudentMemorizationCard({ studentId }: { studentId: string }) {
  const [current, setCurrent] = useState<CurrentMem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("student_memorization")
        .select("status, last_revised_at, catalog_id, memorization_catalog(title)")
        .eq("student_id", studentId)
        .order("last_revised_at", { ascending: false, nullsFirst: false })
      if (!active) return

      const items =
        (data as unknown as {
          status: string
          catalog_id: string
          memorization_catalog: { title: string } | null
        }[]) || []
      const cur = items.find((i) => i.status === "memorizing" && i.memorization_catalog)
      if (!cur) {
        setCurrent(null)
        setLoading(false)
        return
      }

      const { data: chunks } = await supabase
        .from("memorization_chunks")
        .select("id")
        .eq("catalog_id", cur.catalog_id)
      const total = chunks?.length ?? 0

      let done = 0
      if (total > 0) {
        const { data: mine } = await supabase
          .from("student_memorization_chunks")
          .select("chunk_id, memorization_chunks!inner(catalog_id)")
          .eq("student_id", studentId)
          .eq("memorization_chunks.catalog_id", cur.catalog_id)
        done = mine?.length ?? 0
      }

      if (!active) return
      setCurrent({ title: cur.memorization_catalog!.title, done, total })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [studentId])

  const card = "flex flex-col rounded-2xl border border-border bg-card p-[22px_24px] shadow-soft"

  if (loading) {
    return (
      <div className={card}>
        <div className="mb-4 h-3 w-32 shimmer rounded" />
        <div className="flex items-center gap-[18px]">
          <div className="h-[104px] w-[104px] shrink-0 shimmer rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 shimmer rounded-lg" />
            <div className="h-3 w-28 shimmer rounded" />
          </div>
        </div>
        <div className="mt-5 h-12 w-full shimmer rounded-[14px]" />
      </div>
    )
  }

  if (!current) {
    return (
      <div className={card}>
        <div className="mb-4 text-[11px] font-extrabold tracking-[1.2px] text-muted-foreground">
          NOW MEMORIZING
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[hsl(var(--surface-alt))] p-6 text-center">
          <Sprout className="h-8 w-8 text-[hsl(var(--sage))]" strokeWidth={1.75} />
          <div className="mt-2 font-heading text-[18px] font-bold text-foreground">All caught up</div>
          <div className="text-[13px] text-muted-foreground">Nothing in progress right now.</div>
        </div>
        <Link
          href="/student/memorization"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-primary bg-card text-[14px] font-extrabold capitalize text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          View memorization <ArrowRight className="h-[18px] w-[18px]" />
        </Link>
      </div>
    )
  }

  const { title, done, total } = current
  const hasChunks = total > 0
  const pct = hasChunks ? Math.round((done / total) * 100) : 0
  const R = 52
  const C = 2 * Math.PI * R
  const offset = hasChunks ? C * (1 - done / total) : C

  return (
    <div className={card}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-[1.2px] text-muted-foreground">
          NOW MEMORIZING
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--surface-alt))] px-[11px] py-[5px] text-[11.5px] font-extrabold text-[hsl(var(--taupe))]">
          <span className="h-[7px] w-[7px] rounded-full bg-[hsl(var(--taupe))]" />
          On track
        </span>
      </div>

      {/* Tall viewports stack the ring over the text so the taller card reads
          as full rather than padded; everywhere else they sit side by side. */}
      <div className="mb-5 flex grow items-center gap-[18px] tall:flex-col tall:justify-center tall:gap-5 tall:text-center">
        <div className="relative h-[104px] w-[104px] flex-shrink-0 tall:h-[132px] tall:w-[132px]">
          {hasChunks ? (
            <>
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(var(--surface-alt))" strokeWidth={13} />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke="hsl(var(--sage))"
                  strokeWidth={13}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-heading text-[26px] font-bold leading-none text-foreground tall:text-[32px]">
                  {pct}%
                </div>
                <div className="text-[11px] font-bold text-muted-foreground">
                  {done} / {total}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[hsl(var(--surface-alt))]">
              <BookOpen className="h-9 w-9 text-[hsl(var(--sage))]" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="font-heading text-[22px] font-bold leading-[1.15] text-foreground">
            {title}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {hasChunks ? `Part ${Math.min(done + 1, total)} of ${total}` : "In progress"}
          </div>
          {hasChunks && (
            <div className="mt-3 flex flex-col gap-[5px] tall:items-center">
              <span className="flex items-center gap-2 text-[12.5px] font-bold text-foreground">
                <span className="h-[9px] w-[9px] rounded-[3px] bg-[hsl(var(--sage))]" />
                {done} parts done
              </span>
              <span className="flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
                <span className="h-[9px] w-[9px] rounded-[3px] border border-border bg-[hsl(var(--surface-alt))]" />
                {total - done} parts to go
              </span>
            </div>
          )}
        </div>
      </div>

      <Link
        href="/student/memorization"
        className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-primary bg-card text-[14px] font-extrabold capitalize text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        Continue memorizing <ArrowRight className="h-[18px] w-[18px]" />
      </Link>
    </div>
  )
}
