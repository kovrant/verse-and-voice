"use client"

/* eslint-disable @next/next/no-img-element -- remote Supabase URLs; next/image isn't worth it here */

import { Check, X } from "lucide-react"
import { useState } from "react"

import { chunkProgress, labelFor, type MemChunk } from "@/lib/memorization"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export { chunkProgress, labelFor, type MemChunk }

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

/**
 * Grid of chunk images with per-chunk memorized state + a progress bar.
 * Read-only for students; teachers pass `editable` + `onToggle` to tick chunks off.
 */
export function ChunkChecklist({
  chunks,
  memorizedIds,
  editable = false,
  onToggle,
}: {
  chunks: MemChunk[]
  memorizedIds: Set<string>
  editable?: boolean
  onToggle?: (chunk: MemChunk, memorized: boolean) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)

  const { done, total } = chunkProgress(chunks, memorizedIds)
  const pct = total ? Math.round((done / total) * 100) : 0

  if (total === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {done}/{total} parts
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {chunks.map((c, i) => {
          const isDone = memorizedIds.has(c.id)
          return (
            <div
              key={c.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-white transition-all",
                isDone ? "border-emerald-500/60 ring-1 ring-emerald-500/30" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => setPreview(c.image_url)}
                className="block w-full bg-white"
                aria-label={`Preview ${labelFor(c, i)}`}
              >
                <img
                  src={c.image_url}
                  alt={labelFor(c, i)}
                  className="aspect-[3/2] w-full object-contain p-1.5"
                />
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 py-1.5">
                <span className="truncate text-[11px] font-medium text-foreground">
                  {labelFor(c, i)}
                </span>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => onToggle?.(c, !isDone)}
                    className={cn(
                      "flex h-6 flex-shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold transition-colors",
                      isDone
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-secondary text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-600",
                    )}
                  >
                    <Check className="h-3 w-3" />
                    {isDone ? "Done" : "Mark"}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                      isDone ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground/40",
                    )}
                    title={isDone ? "Memorized" : "Not yet"}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={preview}
              alt="Chunk preview"
              className="mx-auto max-h-[85vh] rounded-2xl bg-white object-contain p-2"
            />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
