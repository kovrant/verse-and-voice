"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { BookOpen, ChevronLeft, ChevronRight, FileText, MapPin, X } from "lucide-react"
import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { PanelHeader } from "@/components/panel-header"
import {
  AvatarStack,
  ParaTile,
  positionLabel,
  QuranRail,
  useStudentPositions,
} from "@/components/quran-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PARA_NAMES } from "@/lib/para-names"
import { QAIDA_PARA } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface QuranPara {
  id: string
  title: string
  category: string
  file_url: string
  file_type: string
  meta: Record<string, any>
  created_at: string
}

export default function QuranPage() {
  const [paras, setParas] = useState<QuranPara[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingPara, setViewingPara] = useState<QuranPara | null>(null)
  const [jumpPage, setJumpPage] = useState<number | null>(null)
  const [followId, setFollowId] = useState<string | null>(null)
  const positions = useStudentPositions()

  useEffect(() => {
    loadParas()
  }, [])

  async function loadParas() {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .eq("type", "quran")
      .order("created_at", { ascending: true })

    // Sort by para number if available
    const sorted = (data || []).sort((a, b) => {
      const aNum = a.meta?.para_number || 999
      const bNum = b.meta?.para_number || 999
      return aNum - bNum
    })

    setParas(sorted)
    setLoading(false)
  }

  const paraFile = (n: number) => paras.find((p) => Number(p.meta?.para_number) === n)
  const extraFiles = paras.filter((p) => !p.meta?.para_number)
  const onQuran = (positions ?? []).filter((p) => p.para !== QAIDA_PARA)
  const follow = followId
    ? ((positions ?? []).find((p) => p.student.id === followId) ?? null)
    : null

  function open(para: QuranPara, page: number | null = null) {
    setJumpPage(page)
    setViewingPara(para)
  }

  // Navigate between paras in viewer
  function navigatePara(direction: "prev" | "next") {
    if (!viewingPara) return
    const idx = paras.findIndex((p) => p.id === viewingPara.id)
    if (direction === "prev" && idx > 0) open(paras[idx - 1])
    if (direction === "next" && idx < paras.length - 1) open(paras[idx + 1])
  }

  const currentIdx = viewingPara ? paras.findIndex((p) => p.id === viewingPara.id) : -1

  if (loading) return <PageLoading variant="grid-dense" count={30} />

  // Full-screen PDF viewer
  if (viewingPara) {
    const n = Number(viewingPara.meta?.para_number) || 0
    const name = n ? PARA_NAMES[n - 1] : null
    const readers = onQuran.filter((p) => p.para === n)
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary bg-card-background px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingPara(null)}>
              <X className="mr-1 h-4 w-4" />
              Close
            </Button>
            <div className="h-6 w-px bg-border-primary" />
            {n ? (
              <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {n}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {name ? `Para ${n} · ${name.name}` : viewingPara.title}
              </p>
              {name && (
                <p
                  dir="rtl"
                  className="text-left font-arabic text-base leading-6 text-text-secondary"
                >
                  {name.arabic}
                </p>
              )}
            </div>
          </div>

          {readers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {readers.map((p) => (
                <button
                  key={p.student.id}
                  type="button"
                  onClick={() => p.page && setJumpPage(p.page)}
                  title={p.page ? `Jump to page ${p.page}` : positionLabel(p)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] py-1 pl-1 pr-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <AvatarStack list={[p]} size={22} />
                  {p.student.name}
                  {p.page ? ` · page ${p.page}` : ""}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePara("prev")}
              disabled={currentIdx <= 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePara("next")}
              disabled={currentIdx >= paras.length - 1}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF / Image viewer */}
        <div className="flex-1 overflow-auto">
          {viewingPara.file_type === "pdf" ? (
            <iframe
              // Re-mount on a page jump: browsers only read #page on load
              key={`${viewingPara.id}-${jumpPage ?? 0}`}
              src={jumpPage ? `${viewingPara.file_url}#page=${jumpPage}` : viewingPara.file_url}
              className="h-full w-full"
              title={viewingPara.title}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <img
                src={viewingPara.file_url}
                alt={viewingPara.title}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Quran Map</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          {positions
            ? `${onQuran.length} reading the Quran · ${positions.length - onQuran.length} on Qaida`
            : "Finding where everyone is…"}
          {paras.length < 30 && ` · ${paras.length} of 30 paras uploaded`}
        </p>
      </div>

      {/* Where everyone is */}
      <Card className="p-5">
        <PanelHeader
          icon={MapPin}
          tint="indigo"
          title="Where everyone is"
          summary="Hover a student for page and line · click to open their class"
        />
        <div className="mt-5">
          {positions === null ? (
            <div className="h-24 shimmer rounded-xl" />
          ) : positions.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-tertiary">No reading students yet.</p>
          ) : (
            <QuranRail positions={positions} />
          )}
        </div>
      </Card>

      {/* Follow one student */}
      {positions && onQuran.length > 0 && (
        <div className="space-y-3">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            <FollowChip active={!followId} onClick={() => setFollowId(null)}>
              All students
            </FollowChip>
            {onQuran.map((p) => (
              <FollowChip
                key={p.student.id}
                active={followId === p.student.id}
                onClick={() => setFollowId(p.student.id)}
              >
                <AvatarStack list={[p]} size={20} />
                {p.student.name}
              </FollowChip>
            ))}
          </div>
          {follow && (
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{follow.student.name}</span>
              {follow.roundNum ? ` · Round ${follow.roundNum}` : ""} · {follow.done.length} of 30
              done · {30 - follow.done.length} to go
            </p>
          )}
        </div>
      )}

      {/* The 30 paras */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
          const file = paraFile(n)
          return (
            <ParaTile
              key={n}
              n={n}
              uploaded={!!file}
              here={onQuran.filter((p) => p.para === n)}
              follow={follow}
              onOpen={() => file && open(file, follow?.para === n ? follow.page : null)}
            />
          )
        })}
      </div>

      {/* Uploaded files without a para number */}
      {extraFiles.length > 0 && (
        <Card className="p-5">
          <PanelHeader icon={FileText} tint="sky" title="Other Quran files" />
          <div className="mt-4 flex flex-wrap gap-2">
            {extraFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => open(f)}
                className="rounded-lg border border-card-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                {f.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      {paras.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
              <BookOpen className="h-6 w-6 text-icon-secondary" />
            </div>
            <p className="mb-1 font-medium text-text-primary">No Quran paras uploaded yet</p>
            <p className="mb-5 text-sm text-text-tertiary">
              Upload the para PDFs in the Media Library
            </p>
            <Button variant="outline" onClick={() => (window.location.href = "/teacher/media")}>
              Go to Media Library
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FollowChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-card-border bg-card-background text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  )
}
