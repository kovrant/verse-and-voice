"use client"

import { BookMarked } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { QaidaItem } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"

const NONE = "__none__"

/**
 * Teacher-facing card to assign one Qaida (a type='qaida' media_library row) to
 * a student. Writes students.qaida_media_id; RLS lets the student read their own
 * row + the media library, so no extra policies are needed.
 */
export function StudentQaidaAssign({
  studentId,
  qaidaMediaId,
}: {
  studentId: string
  qaidaMediaId?: string | null
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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <BookMarked className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Qaida</p>
            {loading ? (
              <div className="mt-1.5 h-4 w-44 shimmer rounded" />
            ) : items.length === 0 ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upload a Qaida in the Media Library first.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Pick the Qaida this student reads from in their portal.
              </p>
            )}
          </div>
        </div>

        {!loading && items.length > 0 && (
          <Select
            value={assigned ?? NONE}
            onValueChange={assign}
            disabled={saving}
          >
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
