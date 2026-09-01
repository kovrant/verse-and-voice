"use client"

import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

import { ChevronLeft, ChevronRight, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page } from "react-pdf"
import type { PDFDocumentProxy } from "pdfjs-dist"

import { loadPdfBytes, prefetchPdf } from "@/lib/pdf-document-cache"
import { ratioFromScrollTop, scrollRatioNear, scrollTopFromRatio } from "@/lib/scroll-sync"

interface SyncedPdfViewerProps {
  fileUrl: string
  /** Controlled current page (1-based). */
  page: number
  /** Called when the user turns the page — parent owns the page state. */
  onPageChange: (page: number) => void
  /** Optional label shown in the toolbar, e.g. "Following teacher". */
  followingLabel?: string | null
  /** Called (throttled) with the current in-page scroll ratio (0..1) as the user scrolls. */
  onScrollRatio?: (ratio: number) => void
  /** A remote scroll position to apply. A new object identity each time re-applies it. */
  remoteScroll?: { ratio: number } | null
}

function PdfSkeleton() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-4">
      <div className="relative h-[min(72vh,720px)] w-full max-w-3xl overflow-hidden rounded-md bg-muted shadow-soft">
        <div className="absolute inset-0 shimmer opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}

/** Two-slot page buffer — keep the last rendered page visible while the next paints. */
function BufferedPdfPage({
  page,
  pageWidth,
  visible,
  onRendered,
}: {
  page: number
  pageWidth?: number
  visible: boolean
  onRendered?: () => void
}) {
  return (
    <div
      className={visible ? "relative" : "pointer-events-none absolute inset-0 opacity-0"}
      aria-hidden={!visible}
    >
      <Page
        pageNumber={page}
        width={pageWidth}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        loading={null}
        onRenderSuccess={onRendered}
        className="overflow-hidden rounded-md bg-white shadow-soft"
      />
    </div>
  )
}

/**
 * Single-page PDF viewer (react-pdf) with per-user zoom. The current *page* is
 * a controlled prop so it can be synced across clients; zoom is local (a
 * personal viewing preference, never synced).
 */
export function SyncedPdfViewer({
  fileUrl,
  page,
  onPageChange,
  followingLabel,
  onScrollRatio,
  remoteScroll,
}: SyncedPdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [baseWidth, setBaseWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [errored, setErrored] = useState(false)

  // Warm this para immediately; nearby paras are prefetched by the live class shell.
  useEffect(() => {
    prefetchPdf(fileUrl)
  }, [fileUrl])

  // Fetch bytes via shared cache — react-pdf wants { data }, not a PDFDocumentProxy.
  useEffect(() => {
    let active = true
    setErrored(false)
    void loadPdfBytes(fileUrl)
      .then((data) => {
        if (!active) return
        setPdfData(data)
        setLoadedUrl(fileUrl)
      })
      .catch(() => {
        if (!active) return
        setErrored(true)
      })
    return () => {
      active = false
    }
  }, [fileUrl])

  const ready = pdfData !== null && loadedUrl === fileUrl
  const file = useMemo(() => (ready ? { data: pdfData! } : null), [ready, pdfData])

  // Double-buffer page turns: paint the incoming page off-screen, then swap slots.
  const [slots, setSlots] = useState<[number, number]>(() => [page, page])
  const [activeSlot, setActiveSlot] = useState(0)
  const pageRef = useRef(page)
  const slotsRef = useRef(slots)
  const activeSlotRef = useRef(activeSlot)
  const applyingRemote = useRef(false)
  const suppressEmitUntil = useRef(0)
  const lastRemoteRatio = useRef<number | null>(null)
  pageRef.current = page
  slotsRef.current = slots
  activeSlotRef.current = activeSlot

  useEffect(() => {
    pdfRef.current = null
    setSlots([page, page])
    setActiveSlot(0)
    lastRemoteRatio.current = null
  }, [fileUrl]) // eslint-disable-line react-hooks/exhaustive-deps -- page is read at para switch

  useEffect(() => {
    lastRemoteRatio.current = null
  }, [page])

  useEffect(() => {
    setSlots((prev) => {
      const shown = prev[activeSlotRef.current]
      if (page === shown) return prev
      const idle = activeSlotRef.current === 0 ? 1 : 0
      if (prev[idle] === page) return prev
      const next: [number, number] = [...prev]
      next[idle] = page
      return next
    })
  }, [page])

  const onSlotRendered = useCallback((slot: 0 | 1) => {
    if (slotsRef.current[slot] === pageRef.current && activeSlotRef.current !== slot) {
      setActiveSlot(slot)
    }
  }, [])

  // Warm adjacent pages in pdf.js so turns within a para stay snappy.
  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages <= 0) return
    for (const n of [page - 1, page, page + 1]) {
      if (n >= 1 && n <= numPages) void pdf.getPage(n).catch(() => {})
    }
  }, [page, numPages])

  // Measure container for fit-to-width rendering.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setBaseWidth(Math.max(0, el.clientWidth - 32))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(numPages || 1, n))
      if (clamped !== page) onPageChange(clamped)
      scrollRef.current?.scrollTo({ top: 0 })
    },
    [numPages, page, onPageChange],
  )

  // Keep an out-of-range controlled page in bounds once we know the count.
  useEffect(() => {
    if (numPages > 0 && page > numPages) onPageChange(numPages)
  }, [numPages, page, onPageChange])

  // Broadcast our scroll position (throttled) so the other side can follow.
  const onScrollRatioRef = useRef(onScrollRatio)
  onScrollRatioRef.current = onScrollRatio
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onScrollRatio) return
    let last = 0
    let trailing: ReturnType<typeof setTimeout> | null = null
    const emit = () => {
      if (applyingRemote.current || performance.now() < suppressEmitUntil.current) return
      const ratio = ratioFromScrollTop(el.scrollTop, el.scrollHeight, el.clientHeight)
      if (lastRemoteRatio.current !== null && scrollRatioNear(ratio, lastRemoteRatio.current)) return
      last = performance.now()
      onScrollRatioRef.current?.(ratio)
    }
    const handler = () => {
      if (applyingRemote.current) return
      if (trailing) clearTimeout(trailing)
      if (performance.now() - last >= 90) emit()
      else trailing = setTimeout(emit, 90)
    }
    el.addEventListener("scroll", handler, { passive: true })
    return () => {
      el.removeEventListener("scroll", handler)
      if (trailing) clearTimeout(trailing)
    }
  }, [onScrollRatio])

  const remoteRatio = remoteScroll?.ratio
  useEffect(() => {
    const el = scrollRef.current
    if (!el || remoteRatio === undefined) return
    const current = ratioFromScrollTop(el.scrollTop, el.scrollHeight, el.clientHeight)
    if (scrollRatioNear(current, remoteRatio)) {
      lastRemoteRatio.current = remoteRatio
      return
    }
    applyingRemote.current = true
    suppressEmitUntil.current = performance.now() + 250
    lastRemoteRatio.current = remoteRatio
    el.scrollTop = scrollTopFromRatio(remoteRatio, el.scrollHeight, el.clientHeight)
    const t = setTimeout(() => {
      applyingRemote.current = false
    }, 200)
    return () => clearTimeout(t)
  }, [remoteRatio])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        go(page - 1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        go(page + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, page])

  const pageWidth = baseWidth > 0 ? baseWidth * zoom : undefined
  const atFirst = page <= 1
  const atLast = numPages > 0 && page >= numPages

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={atFirst || !ready}
            aria-label="Previous page"
            className={iconBtn}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[92px] text-center text-sm font-medium tabular-nums text-foreground">
            Page {page}
            {numPages ? <span className="text-muted-foreground"> / {numPages}</span> : null}
          </span>
          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={atLast || !ready}
            aria-label="Next page"
            className={iconBtn}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {followingLabel ? (
            <span className="mr-1 inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {followingLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            aria-label="Zoom out"
            className={iconBtn}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
            aria-label="Zoom in"
            className={iconBtn}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Fit width"
            title="Fit width"
            className={iconBtn}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
        {errored ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Couldn&apos;t load this PDF.
          </div>
        ) : ready && file ? (
          <div className="flex justify-center">
            <Document
              file={file}
              onLoadSuccess={(pdf) => {
                pdfRef.current = pdf
                setNumPages(pdf.numPages)
              }}
              onLoadError={() => setErrored(true)}
              loading={<PdfSkeleton />}
              error={null}
            >
              <div className="relative" style={{ width: pageWidth }}>
                <BufferedPdfPage
                  page={slots[0]}
                  pageWidth={pageWidth}
                  visible={activeSlot === 0}
                  onRendered={() => onSlotRendered(0)}
                />
                <BufferedPdfPage
                  page={slots[1]}
                  pageWidth={pageWidth}
                  visible={activeSlot === 1}
                  onRendered={() => onSlotRendered(1)}
                />
              </div>
            </Document>
          </div>
        ) : (
          <PdfSkeleton />
        )}
      </div>
    </div>
  )
}
