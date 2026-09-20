"use client"

import { LogOut } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import { QuranBookIcon } from "@/components/kid-ui"
import { useLiveClass } from "@/components/live-class-provider"
import { InlineLoader } from "@/components/page-loading"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { StudentBackdrop } from "@/components/student-backdrop"
import { prefetchParaUrls } from "@/lib/pdf-document-cache"
import { supabase } from "@/lib/supabase"
import type { NavState, PointerState } from "@/lib/use-class-channel"

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
  const { peerNav, peerPointer, sendNav, subscribeNav, subscribePointer, leave } = useLiveClass()
  const { setVisible: setAppSidebarVisible } = useSidebarVisibility()

  // Hide the app sidebar and topbar for the duration of the live session; restore on unmount.
  useEffect(() => {
    setAppSidebarVisible(false)
    return () => setAppSidebarVisible(true)
  }, [setAppSidebarVisible])

  const [para, setPara] = useState(1)
  const [page, setPage] = useState(1)
  // Seeded from the provider so a bookmark set before this screen mounted still shows.
  const [remotePointer, setRemotePointer] = useState<PointerState | null>(peerPointer)
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
        if (nav.paraNumber !== paraRef.current) {
          setPara(nav.paraNumber)
          setRemotePointer(null)
        }
        if (nav.page !== pageRef.current) {
          setPage(nav.page)
          setRemotePointer(null)
        }
        if (!syncedRef.current) setSynced(true)
      }),
    [subscribeNav],
  )

  // Follow remote teacher pointer & 16-line highlight ruler.
  useEffect(() => subscribePointer((pointer) => setRemotePointer(pointer)), [subscribePointer])

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
    // `isolate` so the backdrop's -z-10 stays inside this overlay, behind its content.
    <div className="fixed inset-0 z-[70] isolate flex flex-col">
      <StudentBackdrop />

      {/* Header — floating chunky pills, like the rest of the student portal */}
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wider text-accent-foreground shadow-[0_3px_0_hsl(16_48%_40%)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Live
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm">
            <QuranBookIcon className="h-5 w-5" />
            {ready ? (
              <span className="font-heading text-[16px] font-bold text-primary">
                Para {para}
                <span className="text-[13px] font-semibold text-muted-foreground"> / 30</span>
              </span>
            ) : (
              <span className="text-[14px] font-semibold text-muted-foreground">Connecting…</span>
            )}
          </span>

          {/* Teacher bookmark / pointer indicator */}
          {remotePointer?.line ? (
            <span className="hidden animate-fade-in items-center gap-1.5 rounded-full border-[1.5px] border-[hsl(var(--kid-saffron)/0.55)] bg-[hsl(var(--kid-saffron)/0.25)] px-3 py-1.5 text-[13px] font-bold text-foreground sm:inline-flex">
              <span aria-hidden>📍</span>
              Teacher is on line {remotePointer.line}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={leave}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-4 py-2 text-[14px] font-bold text-muted-foreground shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:text-destructive active:translate-y-[3px] active:shadow-none"
        >
          <LogOut className="h-4 w-4" />
          Leave class
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
          remotePointer={remotePointer}
          allowPointing={false}
          kid
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-[hsl(var(--kid-sage)/0.3)] shadow-[0_4px_0_hsl(var(--kid-sage)/0.5)]">
            <QuranBookIcon className="h-10 w-10" />
          </div>
          <p className="font-heading text-[22px] font-bold text-primary">
            Para {para} isn&apos;t available
          </p>
          <p className="text-sm text-muted-foreground">
            This para&apos;s PDF hasn&apos;t been uploaded yet.
          </p>
        </div>
      )}
    </div>
  )
}
