"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { InlineLoader, PageLoading } from "@/components/page-loading"
import { type QaidaItem, resolveAssignedQaida } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

// react-pdf renders client-side only.
const SyncedPdfViewer = dynamic(
  () => import("@/components/synced-pdf-viewer").then((m) => m.SyncedPdfViewer),
  {
    ssr: false,
    loading: () => <InlineLoader label="Opening Qaida…" />,
  },
)

export default function StudentQaidaPage() {
  const { student, loading: studentLoading, error } = useStudent()
  const [items, setItems] = useState<QaidaItem[]>([])
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [page, setPage] = useState(1)

  const qaidaMediaId = student?.qaida_media_id

  useEffect(() => {
    if (!qaidaMediaId) {
      setMediaLoaded(true)
      return
    }
    let active = true
    supabase
      .from("media_library")
      .select("id,title,file_url,category")
      .eq("id", qaidaMediaId)
      .then(({ data }) => {
        if (!active) return
        setItems((data as QaidaItem[]) || [])
        setMediaLoaded(true)
      })
    return () => {
      active = false
    }
  }, [qaidaMediaId])

  const assigned = resolveAssignedQaida(items, qaidaMediaId)

  if (studentLoading || !mediaLoaded) return <PageLoading variant="pdf" student />

  if (error || !student) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🙈</div>
        <p className="mb-1 font-bold">We couldn&apos;t load your profile</p>
        <p className="text-sm text-muted-foreground">{error || "Please contact your teacher."}</p>
      </div>
    )
  }

  if (!assigned) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">📖</div>
        <p className="mb-1 font-bold">Your Qaida is on its way</p>
        <p className="text-sm text-muted-foreground">
          Your teacher hasn&apos;t assigned a Qaida yet. It&apos;ll appear here as soon as they do.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <span className="truncate text-sm font-semibold text-foreground">
          {assigned.title}
          {assigned.category ? (
            <span className="text-muted-foreground"> · {assigned.category}</span>
          ) : null}
        </span>
      </div>
      <SyncedPdfViewer fileUrl={assigned.file_url} page={page} onPageChange={setPage} />
    </div>
  )
}
