"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { KidEmpty, QaidaLettersIcon } from "@/components/kid-ui"
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
      <KidEmpty
        mood="sleepy"
        title="We couldn't load your profile"
        text={error || "Please ask your teacher for help."}
      />
    )
  }

  if (!assigned) {
    return (
      <KidEmpty
        title="Your Qaida is on its way"
        text="Your teacher hasn't given you a Qaida yet. It will appear here as soon as they do."
      />
    )
  }

  return (
    // Height leaves room for the top bar, and on phones for the floating tab bar.
    <div className="mx-auto flex h-[calc(100dvh-12.5rem)] max-w-5xl flex-col animate-fade-in-up lg:h-[calc(100dvh-8.5rem)]">
      <div className="flex items-center gap-2 pb-2">
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 shadow-soft backdrop-blur-sm">
          <QaidaLettersIcon className="text-[15px]" />
          <span className="truncate font-heading text-[16px] font-bold text-primary">
            {assigned.title}
            {assigned.category ? (
              <span className="text-[14px] font-semibold text-muted-foreground">
                {" "}
                · {assigned.category}
              </span>
            ) : null}
          </span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border-[1.5px] border-[hsl(var(--kid-sage)/0.45)] bg-card/60 pt-2 shadow-soft backdrop-blur-sm">
        <SyncedPdfViewer fileUrl={assigned.file_url} page={page} onPageChange={setPage} kid />
      </div>
    </div>
  )
}
