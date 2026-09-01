"use client"

import { BookOpen, LogOut } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import { useLiveClass } from "@/components/live-class-provider"
import { InlineLoader } from "@/components/page-loading"
import { prefetchParaUrls } from "@/lib/pdf-document-cache"
import { supabase } from "@/lib/supabase"
import type { NavState } from "@/lib/use-class-channel"

const SyncedPdfViewer = dynamic(
  () => import("@/components/synced-pdf-viewer").then((m) => m.SyncedPdfViewer),
  {
    ssr: false,
    loading: () => <InlineLoader label="Joining class…" />,
  },
)

/**
 * Full-screen live class for the student. Waits for the teacher's authoritative
 * position (pushed on join) before showing anything, so it always lands on the
 * teacher's exact para/page — never a stale presence guess. Broadcasts the
 * student's own page turns (after syncing) so the teacher follows too.
 */
export function StudentLiveClass() {
  const { peerNav, sendNav, subscribeNav, subscribeScroll, leave } = useLiveClass()

  const [para, setPara] = useState(1)
  const [page, setPage] = useState(1)
  const [remoteScroll, setRemoteScroll] = useState<{ ratio: number } | null>(null)
  const [synced, setSynced] = useState(false)
  const [mediaMap, setMediaMap] = useState<Record<number, string>>({})
  const [mediaLoaded, setMediaLoaded] = useState(false)

  // Echo guard by VALUE, not a flag: remember the last position the teacher
  // pushed us to. We only broadcast when our current position differs from it,
  // so duplicate/no-op teacher broadcasts can never wedge the guard. Starts at
  // a sentinel so we never broadcast our pre-sync guessed position (para 1).
  const lastRemote = useRef<NavState | null>({ paraNumber: -1, page: -1 })
  const paraRef = useRef(para)
  const pageRef = useRef(page)
  const syncedRef = useRef(synced)
  paraRef.current = para
  pageRef.current = page
  syncedRef.current = synced

  // Follow the teacher. The first nav we receive is authoritative — it lands us.
  useEffect(
    () =>
      subscribeNav((nav) => {
        lastRemote.current = { paraNumber: nav.paraNumber, page: nav.page }
        if (nav.paraNumber !== paraRef.current) setPara(nav.paraNumber)
        if (nav.page !== pageRef.current) setPage(nav.page)
        if (!syncedRef.current) setSynced(true)
      }),
    [subscribeNav],
  )

  // Follow remote in-page scroll (teacher or our own side applying the other's).
  useEffect(() => subscribeScroll((ratio) => setRemoteScroll({ ratio })), [subscribeScroll])

  // Fallback: if the teacher hasn't pushed a position within 2.5s (e.g. flaky
  // network), proceed with the presence hint so we don't hang on "Connecting…".
  useEffect(() => {
    if (synced) return
    const t = setTimeout(() => {
      if (peerNav) {
        lastRemote.current = { paraNumber: peerNav.paraNumber, page: peerNav.page }
        setPara(peerNav.paraNumber)
        setPage(peerNav.page)
      }
      setSynced(true)
    }, 2500)
    return () => clearTimeout(t)
  }, [synced, peerNav])

  // Load the Quran para PDFs (para_number → file_url).
  useEffect(() => {
    let active = true
    supabase
      .from("media_library")
      .select("file_url, meta")
      .eq("type", "quran")
      .then(({ data }) => {
        if (!active) return
        const m: Record<number, string> = {}
        for (const r of (data || []) as { file_url: string; meta?: { para_number?: number } }[]) {
          const n = Number(r.meta?.para_number)
          if (n) m[n] = r.file_url
        }
        setMediaMap(m)
        setMediaLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Warm nearby para PDFs so teacher-led para changes feel instant.
  useEffect(() => {
    if (!mediaLoaded) return
    prefetchParaUrls(mediaMap, para)
  }, [mediaLoaded, mediaMap, para])

  // Broadcast our page turns (only after synced) so the teacher follows. Skip
  // only when our position exactly matches what the teacher last pushed us to —
  // that's an echo, not a user turn.
  useEffect(() => {
    if (!synced) return
    const lr = lastRemote.current
    if (lr && lr.paraNumber === para && lr.page === page) return
    sendNav({ paraNumber: para, page })
  }, [para, page, synced, sendNav])

  const ready = synced && mediaLoaded
  const fileUrl = mediaMap[para]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-sm font-semibold text-foreground">
            {ready ? (
              <>
                Para <span className="text-primary">{para}</span>
                <span className="text-muted-foreground text-xs"> / 30</span>
              </>
            ) : (
              <span className="text-muted-foreground">Connecting…</span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={leave}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Leave
        </button>
      </div>

      {/* Body */}
      {!ready ? (
        <InlineLoader label="Connecting to your teacher…" />
      ) : fileUrl ? (
        <SyncedPdfViewer
          fileUrl={fileUrl}
          page={page}
          onPageChange={setPage}
          followingLabel="Synced with teacher"
          remoteScroll={remoteScroll}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Para {para} isn&apos;t available</p>
          <p className="text-sm text-muted-foreground">
            This para&apos;s PDF hasn&apos;t been uploaded yet.
          </p>
        </div>
      )}
    </div>
  )
}
