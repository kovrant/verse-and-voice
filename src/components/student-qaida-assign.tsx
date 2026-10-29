"use client"

import { BookMarked } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { QaidaItem } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"

const NONE = "__none__"

/**
 * Teacher-facing card to assign one Qaida (a type='qaida' media_library row) to
 * a student. Writes students.qaida_media_id; RLS lets the student read their own
 * row + the media library, so no extra policies are needed.
 */
export function StudentQaidaAssign({
  studentId,
  qaidaMediaId,
  embedded = false,
}: {
  studentId: string
  qaidaMediaId?: string | null
  embedded?: boolean
}) {
  const [items, setItems] = useState<QaidaItem[]>([])
  const [assigned, setAssigned] = useState<string | null>(qaidaMediaId ?? null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from("media_library").select("id,title,category,file_url").eq("type", "qaida"),
      supabase.from("students").select("qaida_media_id").eq("id", studentId).maybeSingle(),
    ]).then(([list, student]) => {
      if (!active) return
      setItems((list.data as QaidaItem[]) || [])
      setAssigned((student.data?.qaida_media_id as string | null) ?? null)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [studentId])

  async function assign(value: string) {
    const next = value === NONE ? null : value
    const prev = assigned
    setSaving(true)
    setAssigned(next) // optimistic
    const { error } = await supabase
      .from("students")
      .update({ qaida_media_id: next })
      .eq("id", studentId)
    setSaving(false)
    if (error) {
      setAssigned(prev) // revert
      toast.error("Couldn't update Qaida: " + error.message)
      return
    }
    toast.success(next ? "Qaida assigned" : "Qaida unassigned")
  }

  if (embedded) {
    return (
      <div className="flex flex-col gap-2.5 border-t border-border-primary pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
            <BookMarked className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary">Qaida Book</p>
            <p className="text-[11px] text-text-tertiary truncate">
              {loading
                ? "Loading Qaida library…"
                : items.length === 0
                  ? "Upload a Qaida in Media Library first"
                  : "Shown in student portal"}
            </p>
          </div>
        </div>
        {!loading && items.length > 0 && (
          <Select value={assigned ?? NONE} onValueChange={assign} disabled={saving}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-48 flex-shrink-0">
              <SelectValue placeholder="Select a Qaida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                  {item.category ? ` · ${item.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
            <BookMarked className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Qaida</p>
            {loading ? (
              <div className="mt-1.5 h-4 w-44 shimmer rounded" />
            ) : items.length === 0 ? (
              <p className="mt-0.5 text-sm text-text-tertiary">
                Upload a Qaida in the Media Library first.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-text-tertiary">
                Pick the Qaida this student reads from in their portal.
              </p>
            )}
          </div>
        </div>

        {!loading && items.length > 0 && (
          <Select value={assigned ?? NONE} onValueChange={assign} disabled={saving}>
            <SelectTrigger className="w-full sm:w-56 flex-shrink-0">
              <SelectValue placeholder="Select a Qaida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                  {item.category ? ` · ${item.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
