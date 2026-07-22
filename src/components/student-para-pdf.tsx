"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

// react-pdf renders client-side only.
const PdfThumbnail = dynamic(
  () => import("@/components/pdf-thumbnail").then((m) => m.PdfThumbnail),
  { ssr: false, loading: () => null },
)

interface ParaMedia {
  id: string
  title: string
  file_url: string
}

/**
 * Dashboard card that surfaces the PDF for the student's *current* para (juz),
 * pulled from the shared media_library (type=quran, meta.para_number). Renders
 * a first-page preview that opens the full PDF, with graceful empty/loading
 * states. Renders nothing when there is no current para.
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

  const card =
    "flex flex-col gap-[22px] rounded-2xl border border-border bg-card p-[24px_26px] shadow-soft sm:flex-row sm:items-center"

  if (loading) {
    return (
      <div className={card}>
        <div className="h-[168px] w-[126px] shrink-0 shimmer rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 shimmer rounded" />
          <div className="h-6 w-40 shimmer rounded-lg" />
          <div className="h-3 w-56 shimmer rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={card}>
      {/* PDF preview (page 1) */}
      {item ? (
        <a
          href={item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block h-[168px] w-[126px] shrink-0 overflow-hidden rounded-xl border border-border transition-transform hover:scale-[1.02]"
          aria-label={`Open Para ${paraNumber} PDF`}
        >
          <PdfThumbnail
            fileUrl={item.file_url}
            width={126}
            fallback={
              <div className="flex h-full items-center justify-center bg-secondary text-3xl">
                📄
              </div>
            }
          />
        </a>
      ) : (
        <div className="flex h-[168px] w-[126px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-3xl">
          📄
        </div>
      )}

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div
          className="text-[12px] font-semibold text-muted-foreground"
          style={{ letterSpacing: "1.4px" }}
        >
          CURRENT PARA
        </div>
        <div className="font-heading text-[22px] font-bold text-foreground">
          Para {paraNumber}
          <span className="text-[15px] font-semibold text-muted-foreground"> · PDF</span>
        </div>

        {item ? (
          <>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Open your current juz to read along.
            </div>
            <div className="mt-[16px] flex flex-wrap gap-[10px]">
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-primary px-[18px] py-[9px] text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))]"
              >
                Open PDF ↗
              </a>
              <a
                href={item.file_url}
                download
                className="rounded-lg border border-border bg-card px-[18px] py-[9px] text-[14px] font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Download
              </a>
            </div>
          </>
        ) : (
          <div className="mt-1 text-[13px] text-muted-foreground">
            Para {paraNumber} isn&apos;t available yet — check back soon.
          </div>
        )}
      </div>
    </div>
  )
}
