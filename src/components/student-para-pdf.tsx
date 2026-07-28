"use client"

import { FileText } from "lucide-react"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

interface ParaMedia {
  id: string
  title: string
  file_url: string
}

// Standard Madani mushaf (604 pages) — first page of each juz (index = juz no.).
const JUZ_START = [
  0, 1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
]
function juzPages(n: number): string {
  if (n < 1 || n > 30) return ""
  const start = JUZ_START[n]
  const end = n < 30 ? JUZ_START[n + 1] - 1 : 604
  return `${start}\u2013${end}`
}

/**
 * Dashboard "Current Para" card — surfaces the PDF for the student's current
 * para (juz) from the shared media_library (type=quran, meta.para_number) and
 * opens it. Renders nothing when there is no current para.
 */
export function StudentParaPdf({ paraNumber }: { paraNumber: number | null }) {
  const [item, setItem] = useState<ParaMedia | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!paraNumber) {
        if (active) setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from("media_library")
        .select("id, title, file_url, meta")
        .eq("type", "quran")
      if (!active) return
      const match =
        (data || []).find(
          (m: { meta?: { para_number?: number } }) => Number(m.meta?.para_number) === paraNumber,
        ) || null
      setItem(match ? { id: match.id, title: match.title, file_url: match.file_url } : null)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [paraNumber])

  if (!paraNumber) return null

  const card = "flex flex-col rounded-2xl border border-border bg-card p-[22px_24px] shadow-soft"

  if (loading) {
    return (
      <div className={card}>
        <div className="mb-4 h-3 w-24 shimmer rounded" />
        <div className="flex items-center gap-4">
          <div className="h-32 w-24 shrink-0 shimmer rounded-[6px_12px_12px_6px]" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 shimmer rounded-lg" />
            <div className="h-3 w-24 shimmer rounded" />
            <div className="h-6 w-28 shimmer rounded-lg" />
          </div>
        </div>
        <div className="mt-5 h-12 w-full shimmer rounded-[14px]" />
      </div>
    )
  }

  return (
    <div className={card}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-[1.2px] text-muted-foreground">
          CURRENT PARA
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--surface-alt))] px-[11px] py-[5px] text-[11.5px] font-extrabold text-[hsl(var(--sage))]">
          <span className="h-[7px] w-[7px] rounded-full bg-[hsl(var(--sage))]" />
          Reading now
        </span>
      </div>

      <div className="mb-5 flex items-center gap-4">
        {/* Mushaf cover */}
        <div className="relative flex h-32 w-24 flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded-[6px_12px_12px_6px] bg-gradient-to-br from-primary to-[hsl(var(--sage))] shadow-[0_10px_22px_-8px_hsl(var(--primary)/0.55)]">
          <div className="absolute inset-y-0 left-0 w-2 bg-black/20" />
          <div
            className="absolute rounded-md border-[1.5px]"
            style={{ inset: "9px 9px 9px 15px", borderColor: "rgba(246,196,106,.6)" }}
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#f6c46a" className="mb-1" aria-hidden>
            <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />
          </svg>
          <div className="font-heading text-[13px] font-bold tracking-[1px] text-white/85">PARA</div>
          <div className="font-heading text-[38px] font-bold leading-[0.9] text-primary-foreground">
            {paraNumber}
          </div>
        </div>

        <div className="min-w-0">
          <div className="font-heading text-[22px] font-bold leading-[1.15] text-foreground">
            {item?.title || `Para ${paraNumber}`}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">Juz {paraNumber} of 30</div>
          <div className="mt-3 flex flex-wrap gap-[7px]">
            <span className="rounded-[9px] bg-[hsl(var(--surface-alt))] px-[10px] py-[5px] text-[12px] font-bold text-foreground">
              Pages {juzPages(paraNumber)}
            </span>
          </div>
        </div>
      </div>

      {item ? (
        <a
          href={item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[14px] font-extrabold capitalize text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))]"
        >
          <FileText className="h-[18px] w-[18px]" /> Open PDF
        </a>
      ) : (
        <div className="mt-auto flex h-12 w-full items-center justify-center rounded-[14px] border border-border bg-[hsl(var(--surface-alt))] text-[14px] font-bold text-muted-foreground">
          PDF coming soon
        </div>
      )}
    </div>
  )
}
