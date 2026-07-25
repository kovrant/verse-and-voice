"use client"

import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

import { ChevronLeft, ChevronRight, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

import { ratioFromScrollTop, scrollTopFromRatio } from "@/lib/scroll-sync"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

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
  const [numPages, setNumPages] = useState(0)
  const [baseWidth, setBaseWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [errored, setErrored] = useState(false)

  // Reset per-document state when the file changes (para switch).
  useEffect(() => {
    setNumPages(0)
    setErrored(false)
  }, [fileUrl])

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
  // Suppressed while we're programmatically applying a remote scroll, so a
  // follower never echoes the leader's position back.
  const onScrollRatioRef = useRef(onScrollRatio)
  onScrollRatioRef.current = onScrollRatio
  const applyingRemote = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onScrollRatio) return
    let last = 0
    let trailing: ReturnType<typeof setTimeout> | null = null
    const emit = () => {
      last = performance.now()
      onScrollRatioRef.current?.(ratioFromScrollTop(el.scrollTop, el.scrollHeight, el.clientHeight))
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

  // Apply an incoming remote scroll position (follower side). New object identity
  // each broadcast so repeated identical ratios still re-sync us.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !remoteScroll) return
    applyingRemote.current = true
    el.scrollTop = scrollTopFromRatio(remoteScroll.ratio, el.scrollHeight, el.clientHeight)
    // Release the guard after the resulting scroll event has fired.
    const t = setTimeout(() => (applyingRemote.current = false), 0)
    return () => clearTimeout(t)
  }, [remoteScroll])

  // Arrow keys turn PDF pages (ignored while typing).
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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={atFirst}
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
            disabled={atLast}
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

      {/* Page surface */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
        {errored ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Couldn&apos;t load this PDF.
          </div>
        ) : (
          <div className="flex justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setErrored(true)}
              loading={
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
              error={null}
            >
              <Page
                pageNumber={page}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={null}
                className="overflow-hidden rounded-md bg-white shadow-soft"
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}
