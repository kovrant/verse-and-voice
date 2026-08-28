"use client"

/* eslint-disable @next/next/no-img-element -- remote Supabase URLs; next/image isn't worth it here */

import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  chunkProgress,
  currentChunkIndex,
  labelFor,
  type MemChunk,
} from "@/lib/memorization"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export { labelFor, type MemChunk }

/** Load all chunks for the given catalog items, grouped by catalog_id, each in order. */
export async function loadChunksFor(catalogIds: string[]): Promise<Record<string, MemChunk[]>> {
  if (catalogIds.length === 0) return {}
  const { data } = await supabase
    .from("memorization_chunks")
    .select("*")
    .in("catalog_id", catalogIds)
    .order("order_index", { ascending: true })
  const map: Record<string, MemChunk[]> = {}
  for (const c of (data as MemChunk[]) || []) {
    ;(map[c.catalog_id] ??= []).push(c)
  }
  return map
}

/** The set of chunk ids a student has already memorized. */
export async function loadMemorizedChunkIds(studentId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("student_memorization_chunks")
    .select("chunk_id")
    .eq("student_id", studentId)
  return new Set(((data as { chunk_id: string }[]) || []).map((r) => r.chunk_id))
}

/**
 * Mark/unmark a single chunk for a student. A DB trigger recomputes the item's
 * overall student_memorization.status (memorized only when every chunk is done).
 */
export async function setChunkMemorized(studentId: string, chunkId: string, memorized: boolean) {
  if (memorized) {
    return supabase
      .from("student_memorization_chunks")
      .upsert(
        { student_id: studentId, chunk_id: chunkId },
        { onConflict: "student_id,chunk_id", ignoreDuplicates: true },
      )
  }
  return supabase
    .from("student_memorization_chunks")
    .delete()
    .eq("student_id", studentId)
    .eq("chunk_id", chunkId)
}

/** One page in the viewer — a lesson overview, or a single part. */
interface ViewerPage {
  src: string
  label: string
  /** Compact label for the thumbnail strip ("All", "3"). */
  short: string
  done?: boolean
}

function ViewerArrow({
  side,
  disabled,
  onClick,
}: {
  side: "prev" | "next"
  disabled: boolean
  onClick: () => void
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "prev" ? "Previous page" : "Next page"}
      className={cn(
        "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-border bg-card/95 text-foreground shadow-soft backdrop-blur transition-all",
        "hover:bg-secondary disabled:pointer-events-none disabled:opacity-0",
        side === "prev" ? "left-2" : "right-2",
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}

/**
 * Full-screen page viewer. Built on the shared Dialog so it gets Escape, focus
 * trapping and restore, scroll lock and the app's open/close animation — the
 * hand-rolled overlay this replaced had none of them.
 *
 * It also moves between pages, so a child comparing part 3 with part 4 doesn't
 * have to close and reopen it once per page.
 */
function MemPageViewer({
  pages,
  index,
  onIndexChange,
  onClose,
}: {
  pages: ViewerPage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const page = pages[index]
  if (!page) return null

  const many = pages.length > 1
  const go = (delta: number) => {
    const next = index + delta
    if (next >= 0 && next < pages.length) onIndexChange(next)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl gap-3 p-4 sm:p-5"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            go(-1)
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            go(1)
          }
        }}
      >
        <DialogHeader className="pr-10 text-left sm:text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            {page.label}
            {page.done && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                Memorized
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {many
              ? `Page ${index + 1} of ${pages.length} — use the arrows to move between pages`
              : "Press Escape or tap outside to close"}
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-white">
          <img
            src={page.src}
            alt={page.label}
            className="max-h-[66vh] w-full object-contain p-3"
          />
          {many && (
            <>
              <ViewerArrow side="prev" disabled={index === 0} onClick={() => go(-1)} />
              <ViewerArrow
                side="next"
                disabled={index === pages.length - 1}
                onClick={() => go(1)}
              />
            </>
          )}
        </div>

        {many && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 main-scroll">
            {pages.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={p.label}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "flex h-8 min-w-8 flex-shrink-0 items-center justify-center gap-1 rounded-lg px-2",
                  "text-xs font-bold tabular-nums transition-all",
                  i === index
                    ? "bg-foreground text-background"
                    : p.done
                      ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                      : "bg-secondary text-muted-foreground hover:bg-muted",
                )}
              >
                {p.done && i !== index && <Check className="h-3 w-3" />}
                {p.short}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

type PartState = "done" | "current" | "upcoming"

function partState(index: number, currentIdx: number, isDone: boolean): PartState {
  if (isDone) return "done"
  if (currentIdx === -1) return "done"
  if (index === currentIdx) return "current"
  return "upcoming"
}

/** Horizontal numbered path: done / current / upcoming. */
function MemPartPath({
  chunks,
  memorizedIds,
  selectedIndex,
  onSelect,
  celebratingId,
}: {
  chunks: MemChunk[]
  memorizedIds: Set<string>
  selectedIndex?: number
  onSelect?: (index: number) => void
  /** Part being celebrated right now — pops so the eye lands on it. */
  celebratingId?: string | null
}) {
  const currentIdx = currentChunkIndex(chunks, memorizedIds)
  if (chunks.length === 0) return null

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 main-scroll">
      {chunks.map((c, i) => {
        const isDone = memorizedIds.has(c.id)
        const state = partState(i, currentIdx, isDone)
        const selected = selectedIndex === i
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(i)}
            aria-label={`${labelFor(c, i)}${state === "done" ? ", memorized" : state === "current" ? ", current lesson" : ""}`}
            className={cn(
              "flex h-10 min-w-10 flex-shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-bold tabular-nums transition-all",
              state === "done" &&
                "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600",
              state === "current" &&
                "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-300/60",
              state === "upcoming" &&
                "bg-secondary text-muted-foreground ring-1 ring-border hover:bg-muted",
              selected && state !== "current" && "ring-2 ring-foreground/20",
              celebratingId === c.id &&
                "celebrate-pop ring-4 ring-amber-300 shadow-lg shadow-emerald-500/40",
            )}
          >
            {state === "done" ? <Check className="h-3.5 w-3.5" /> : null}
            <span>{i + 1}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Large image for the active / selected part (student spotlight or teacher panel). */
function MemPartHero({
  chunk,
  index,
  badge,
  subtitle,
}: {
  chunk: MemChunk
  index: number
  badge?: string
  subtitle?: string
}) {
  const [preview, setPreview] = useState(false)
  const title = labelFor(chunk, index)

  return (
    <div className="space-y-2">
      {(badge || subtitle) && (
        <div className="flex flex-wrap items-center gap-2">
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
              {badge}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={() => setPreview(true)}
        className="group relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all hover:border-amber-500/40"
      >
        <img
          src={chunk.image_url}
          alt={title}
          className="mx-auto max-h-56 w-full object-contain p-4 sm:max-h-72"
        />
        <span className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          Tap to enlarge
        </span>
      </button>
      {preview && (
        <MemPageViewer
          pages={[{ src: chunk.image_url, label: title, short: String(index + 1) }]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  )
}

/**
 * Teacher workspace: part path + large selected image + mark/undo.
 * Defaults selection to the current (next unmemorized) part.
 */
export function MemPartWorkspace({
  chunks,
  memorizedIds,
  onToggle,
}: {
  chunks: MemChunk[]
  memorizedIds: Set<string>
  onToggle: (chunk: MemChunk, memorized: boolean) => void
}) {
  const { done, total, isMemorized } = chunkProgress(chunks, memorizedIds)
  const currentIdx = currentChunkIndex(chunks, memorizedIds)
  const [selected, setSelected] = useState(() => (currentIdx >= 0 ? currentIdx : 0))

  // Keep selection on the current lesson when progress advances.
  useEffect(() => {
    if (currentIdx >= 0) setSelected(currentIdx)
    else if (chunks.length > 0) setSelected(chunks.length - 1)
  }, [currentIdx, chunks.length])

  if (total === 0) return null

  const safeIdx = Math.min(selected, chunks.length - 1)
  const active = chunks[safeIdx]
  const activeDone = memorizedIds.has(active.id)
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </div>

      <MemPartPath
        chunks={chunks}
        memorizedIds={memorizedIds}
        selectedIndex={safeIdx}
        onSelect={setSelected}
      />

      {isMemorized ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            All parts memorized
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tap a number above to review or undo a part.
          </p>
        </div>
      ) : (
        <MemPartHero
          chunk={active}
          index={safeIdx}
          badge={safeIdx === currentIdx ? "Current lesson" : undefined}
          subtitle={labelFor(active, safeIdx)}
        />
      )}

      {!isMemorized && (
        <button
          type="button"
          onClick={() => onToggle(active, !activeDone)}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
            activeDone
              ? "border border-border bg-card text-muted-foreground hover:bg-secondary"
              : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
          )}
        >
          <Check className="h-4 w-4" />
          {activeDone ? "Undo this part" : `Mark ${labelFor(active, safeIdx)} memorized`}
        </button>
      )}

      {isMemorized && (
        <button
          type="button"
          onClick={() => onToggle(active, false)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-secondary"
        >
          Undo {labelFor(active, safeIdx)}
        </button>
      )}
    </div>
  )
}

/** Student read-only lesson view: path + today's lesson hero. */
export function MemStudentLesson({
  chunks,
  memorizedIds,
  overviewUrl,
  title,
  celebratingId,
}: {
  chunks: MemChunk[]
  memorizedIds: Set<string>
  overviewUrl?: string | null
  title: string
  celebratingId?: string | null
}) {
  const { done, total, isMemorized } = chunkProgress(chunks, memorizedIds)
  const currentIdx = currentChunkIndex(chunks, memorizedIds)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)

  if (total === 0) return null

  const heroIdx = currentIdx >= 0 ? currentIdx : total - 1
  const hero = chunks[heroIdx]
  const pct = Math.round((done / total) * 100)

  // One viewer over the whole lesson: the overview first (when there is one),
  // then every part, so a child can page through all of it in one go.
  const pages: ViewerPage[] = [
    ...(overviewUrl ? [{ src: overviewUrl, label: `Full ${title}`, short: "All" }] : []),
    ...chunks.map((c, i) => ({
      src: c.image_url,
      label: labelFor(c, i),
      short: String(i + 1),
      done: memorizedIds.has(c.id),
    })),
  ]
  const chunkPageOffset = overviewUrl ? 1 : 0

  return (
    <div className="space-y-4">
      {overviewUrl && (
        <button
          type="button"
          onClick={() => setPreviewIdx(0)}
          className="block w-full overflow-hidden rounded-xl border border-border/60 bg-white"
          aria-label={`View full ${title}`}
        >
          <img
            src={overviewUrl}
            alt={`Full ${title}`}
            className="max-h-28 w-full object-contain p-2"
          />
          <p className="border-t border-border/40 bg-secondary/30 px-3 py-1.5 text-center text-[10px] font-medium text-muted-foreground">
            The whole lesson — tap to view
          </p>
        </button>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isMemorized ? "All done!" : `Part ${heroIdx + 1} of ${total}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isMemorized
              ? "You've memorized every part"
              : "You're learning this part now"}
          </p>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <MemPartPath
        chunks={chunks}
        memorizedIds={memorizedIds}
        selectedIndex={heroIdx}
        onSelect={(i) => setPreviewIdx(i + chunkPageOffset)}
        celebratingId={celebratingId}
      />

      {!isMemorized && (
        <MemPartHero
          chunk={hero}
          index={heroIdx}
          badge="Today's lesson"
          subtitle={labelFor(hero, heroIdx)}
        />
      )}

      {isMemorized && (
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent px-4 py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            {title} memorized!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap the numbers above to revisit any part.
          </p>
        </div>
      )}

      {previewIdx != null && (
        <MemPageViewer
          pages={pages}
          index={Math.min(previewIdx, pages.length - 1)}
          onIndexChange={setPreviewIdx}
          onClose={() => setPreviewIdx(null)}
        />
      )}
    </div>
  )
}
