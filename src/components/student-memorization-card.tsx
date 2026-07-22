"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

interface MemItem {
  id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: CatalogItem | null
}

/**
 * Dashboard card showing what the student is *currently* memorizing (status =
 * "memorizing"), pulled from student_memorization joined to the shared catalog.
 * Shows a compact list of in-progress items with a memorized-count footer.
 */
export function StudentMemorizationCard({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<MemItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from("student_memorization")
      .select("id, status, last_revised_at, memorization_catalog(id, title, category, image_url)")
      .eq("student_id", studentId)
      .order("last_revised_at", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (!active) return
        setItems((data as unknown as MemItem[]) || [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId])

  const card = "flex flex-col rounded-2xl border border-border bg-card p-[24px_26px] shadow-soft"

  if (loading) {
    return (
      <div className={card}>
        <div className="mb-4 h-3 w-32 shimmer rounded" />
        <div className="space-y-3">
          <div className="h-12 shimmer rounded-xl" />
          <div className="h-12 shimmer rounded-xl" />
        </div>
      </div>
    )
  }

  const memorizing = items.filter((m) => m.status === "memorizing" && m.memorization_catalog)
  const memorizedCount = items.filter((m) => m.status === "memorized").length
  const shown = memorizing.slice(0, 3)
  const extra = memorizing.length - shown.length

  return (
    <div className={card}>
      {/* Header */}
      <div className="mb-[18px] flex items-center gap-[12px]">
        <div className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-secondary text-[22px]">
          📖
        </div>
        <div>
          <div
            className="text-[12px] font-semibold text-muted-foreground"
            style={{ letterSpacing: "1.4px" }}
          >
            NOW MEMORIZING
          </div>
          <div className="font-heading text-[20px] font-bold text-foreground">
            {memorizing.length > 0 ? `${memorizing.length} in progress` : "All caught up"}
          </div>
        </div>
      </div>

      {/* Items */}
      {shown.length > 0 ? (
        <div className="space-y-[10px]">
          {shown.map((m) => {
            const c = m.memorization_catalog!
            return (
              <div
                key={m.id}
                className="flex items-center gap-[12px] rounded-xl bg-secondary p-[9px_12px]"
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_url}
                    alt=""
                    className="h-[38px] w-[38px] flex-shrink-0 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-lg bg-card text-[18px]">
                    🌙
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-heading text-[15px] font-bold text-foreground">
                    {c.title}
                  </div>
                  <div className="truncate text-[12px] text-muted-foreground">{c.category}</div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-card px-[10px] py-[3px] text-[11px] font-semibold text-muted-foreground">
                  Memorizing
                </span>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="text-[12px] font-medium text-muted-foreground">
              +{extra} more in progress
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-secondary p-[16px] text-[13px] text-muted-foreground">
          Nothing in progress right now. 🌱
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto flex items-center justify-between border-t border-border pt-[16px]"
        style={{ marginTop: shown.length > 0 ? "18px" : "16px" }}
      >
        <div className="flex items-center gap-[7px] text-[13px] font-medium text-muted-foreground">
          <span className="h-[12px] w-[12px] rounded-[4px] bg-primary" />
          {memorizedCount} memorized
        </div>
        <Link
          href="/student/memorization"
          className="text-[13px] font-semibold text-foreground transition-colors hover:text-[hsl(var(--primary-hover))]"
        >
          View all →
        </Link>
      </div>
    </div>
  )
}
