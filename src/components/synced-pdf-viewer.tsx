"use client"

import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page } from "react-pdf"
import type { PDFDocumentProxy } from "pdfjs-dist"

import { loadPdfBytes, prefetchPdf } from "@/lib/pdf-document-cache"
import { calculateLineBounds, calculateMushafLine } from "@/lib/mushaf-pointer"
import type { PointerState } from "@/lib/use-class-channel"

export type ViewMode = "standard" | "width" | "page"

interface SyncedPdfViewerProps {
  fileUrl: string
  /** Controlled current page (1-based). */
  page: number
  /** Called when the user turns the page — parent owns the page state. */
  onPageChange: (page: number) => void
  /** Optional label shown in the toolbar, e.g. "Following teacher". */
  followingLabel?: string | null
  /** Called with the laser pointer position (0..1 ratio of page, line 1..16). */
  onPointerChange?: (pointer: PointerState | null) => void
  /** A remote pointer position to display and scroll into view. */
  remotePointer?: PointerState | null
  /** Whether this viewer allows clicking to place a pointer (default: true). */
  allowPointing?: boolean
  /** Called (throttled) with the current in-page scroll ratio (0..1) as the user scrolls. */
  onScrollRatio?: (ratio: number) => void
  /** A remote scroll position to apply. */
  remoteScroll?: { ratio: number } | null
}

function PdfSkeleton() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-2 sm:p-4">
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
  pageHeight,
  visible,
  onRendered,
  pointer,
  onPageClick,
  allowPointing,
}: {
  page: number
  pageWidth?: number
  pageHeight?: number
  visible: boolean
  onRendered?: () => void
  pointer?: PointerState | null
  onPageClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  allowPointing?: boolean
}) {
  const lineBounds =
    pointer && typeof pointer.line === "number" && pointer.line >= 1 && pointer.line <= 16
      ? calculateLineBounds(pointer.line, 16)
      : null

  return (
    <div
      className={
        visible
          ? "relative flex justify-center select-none"
          : "pointer-events-none absolute inset-0 opacity-0"
      }
      aria-hidden={!visible}
    >
      <div
        className={`relative inline-block overflow-hidden rounded-md bg-white shadow-soft ${
          allowPointing ? "cursor-crosshair" : "cursor-default"
        }`}
        onClick={visible && allowPointing ? onPageClick : undefined}
      >
        <Page
          pageNumber={page}
          width={pageWidth}
          height={pageHeight}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading={null}
          onRenderSuccess={onRendered}
        />

        {/* 16-Line Highlight Strip & Laser Pointer Overlay */}
        {visible && pointer && typeof pointer.y === "number" && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {/* 16-Line Mild Green Highlight Strip */}
            {lineBounds && (
              <div
                className="absolute inset-x-0 border-y border-emerald-500/35 bg-emerald-500/15 backdrop-blur-[0.5px] transition-all duration-200"
                style={{
                  top: `${lineBounds.topPercent}%`,
                  height: `${lineBounds.heightPercent}%`,
                }}
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-emerald-700/90 dark:bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  Line {pointer.line}
                </div>
              </div>
            )}

            {/* Glowing Mild Green Laser Pointer Pin */}
            <div
              className="absolute transition-all duration-150"
              style={{
                left: `${Math.max(0, Math.min(1, pointer.x)) * 100}%`,
                top: `${Math.max(0, Math.min(1, pointer.y)) * 100}%`,
              }}
            >
              <div className="relative -left-3 -top-3 flex h-6 w-6 items-center justify-center">
                <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-emerald-500/40" />
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Single-page Quran Mushaf PDF viewer with:
 * 1. Default standard iPad framing (~740px wide) for large, crisp 16-line text
 * 2. Mobile-optimized responsive toolbar (no awkward wrapping)
 * 3. Realtime Teacher Pointer & 16-Line Ruler overlay
 * 4. Responsive fit modes: "ipad" (recommended), "width", and "page"
 */
export function SyncedPdfViewer({
  fileUrl,
  page,
  onPageChange,
  followingLabel,
  onPointerChange,
  remotePointer,
  allowPointing = true,
}: SyncedPdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [baseWidth, setBaseWidth] = useState(0)
  const [baseHeight, setBaseHeight] = useState(0)
  const [fitMode, setFitMode] = useState<ViewMode>("standard")
  const [zoom, setZoom] = useState(1)
  const [errored, setErrored] = useState(false)
  const [localPointer, setLocalPointer] = useState<PointerState | null>(null)

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
  pageRef.current = page
  slotsRef.current = slots
  activeSlotRef.current = activeSlot

  useEffect(() => {
    pdfRef.current = null
    setSlots([page, page])
    setActiveSlot(0)
    setLocalPointer(null)
    onPointerChange?.(null)
  }, [fileUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalPointer(null)
    onPointerChange?.(null)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Measure container for rendering dimensions.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      const horizontalPadding = window.innerWidth < 640 ? 8 : 32
      const verticalPadding = window.innerWidth < 640 ? 8 : 32
      setBaseWidth(Math.max(0, el.clientWidth - horizontalPadding))
      setBaseHeight(Math.max(0, el.clientHeight - verticalPadding))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(numPages || 1, n))
      if (clamped !== page) {
        onPageChange(clamped)
        setLocalPointer(null)
        onPointerChange?.(null)
      }
      scrollRef.current?.scrollTo({ top: 0 })
    },
    [numPages, page, onPageChange, onPointerChange],
  )

  // Keep an out-of-range controlled page in bounds once we know the count.
  useEffect(() => {
    if (numPages > 0 && page > numPages) onPageChange(numPages)
  }, [numPages, page, onPageChange])

  // Effective pointer is remotePointer (if provided) or localPointer.
  const activePointer = remotePointer !== undefined ? remotePointer : localPointer

  // Auto-scroll pointed line into view smoothly when receiving a pointer.
  useEffect(() => {
    if (!activePointer || typeof activePointer.y !== "number") return
    const el = scrollRef.current
    if (!el) return

    const scrollContainerHeight = el.clientHeight
    const scrollTotalHeight = el.scrollHeight
    if (scrollTotalHeight <= scrollContainerHeight) return

    const targetYInPage = activePointer.y * scrollTotalHeight
    const desiredScrollTop = Math.max(0, targetYInPage - scrollContainerHeight / 2)

    el.scrollTo({
      top: desiredScrollTop,
      behavior: "smooth",
    })
  }, [activePointer])

  // Click handler to place laser pointer and highlight line.
  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!allowPointing) return
      const rect = e.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const line = calculateMushafLine(y, 16)

      // Clicking the same line toggles off the line ruler & pointer
      if (localPointer && localPointer.line === line) {
        setLocalPointer(null)
        onPointerChange?.(null)
        return
      }

      const newPointer: PointerState = {
        x: Number(x.toFixed(4)),
        y: Number(y.toFixed(4)),
        line,
      }

      setLocalPointer(newPointer)
      onPointerChange?.(newPointer)
    },
    [allowPointing, onPointerChange, localPointer],
  )

  const clearPointer = useCallback(() => {
    setLocalPointer(null)
    onPointerChange?.(null)
  }, [onPointerChange])

  // Keyboard navigation.
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

  // Dimensions based on fitMode:
  // - "standard": Optimal readable Mushaf width (~740px, or container baseWidth if smaller), with zoom scaling.
  // - "width": Full available container width.
  // - "page": Fits entire height on screen without vertical scroll.
  const standardBaseWidth = baseWidth > 0 ? Math.min(baseWidth, 740) : 740
  const pageWidth =
    fitMode === "standard"
      ? standardBaseWidth * zoom
      : fitMode === "width" && baseWidth > 0
        ? baseWidth * zoom
        : undefined

  const pageHeight =
    fitMode === "page" && baseHeight > 0 ? baseHeight * zoom : undefined

  const atFirst = page <= 1
  const atLast = numPages > 0 && page >= numPages

  const iconBtn =
    "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Quran Toolbar — responsive, clean wrap/flex */}
      <div className="flex items-center justify-between gap-1.5 border-b border-border bg-card px-2.5 py-1.5 sm:px-3 sm:py-2">
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={atFirst || !ready}
            aria-label="Previous page"
            title="Previous page (← Arrow)"
            className={iconBtn}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[65px] sm:min-w-[90px] text-center text-xs sm:text-sm font-semibold tabular-nums text-foreground">
            <span className="hidden sm:inline">Page </span>
            {page}
            {numPages ? <span className="text-muted-foreground font-normal"> / {numPages}</span> : null}
          </span>
          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={atLast || !ready}
            aria-label="Next page"
            title="Next page (→ Arrow)"
            className={iconBtn}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: View Mode & Zoom & Pointer Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {followingLabel ? (
            <span className="hidden md:inline-flex mr-1 items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {followingLabel}
            </span>
          ) : null}

          {/* Active pointer banner / clear */}
          {activePointer ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              <Crosshair className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Line {activePointer.line ?? "•"}</span>
              <button
                type="button"
                onClick={clearPointer}
                aria-label="Clear pointer"
                title="Clear pointer highlight"
                className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              >
                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
            </div>
          ) : null}

          {/* View Mode Segmented Controls */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => {
                setFitMode("standard")
                setZoom(1)
              }}
              title="Standard Mushaf Width (~740px — 16-Line Reading Width)"
              className={`flex h-6 sm:h-7 items-center gap-1 rounded-md px-1.5 sm:px-2 text-xs font-semibold transition-all ${
                fitMode === "standard"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Standard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFitMode("width")
                setZoom(1)
              }}
              title="Fit to Width"
              className={`flex h-6 sm:h-7 items-center gap-1 rounded-md px-1.5 sm:px-2 text-xs font-semibold transition-all ${
                fitMode === "width"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Fit Width</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFitMode("page")
                setZoom(1)
              }}
              title="Fit Full Page (Fit 16 Lines vertically)"
              className={`flex h-6 sm:h-7 items-center gap-1 rounded-md px-1.5 sm:px-2 text-xs font-semibold transition-all ${
                fitMode === "page"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Full Page</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 border-l border-border pl-1 sm:pl-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              disabled={zoom <= 0.6}
              aria-label="Zoom out"
              title="Zoom out"
              className={iconBtn}
            >
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Clickable Zoom Percentage Badge */}
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Click to reset zoom to 100%"
              aria-label="Reset zoom to 100%"
              className="h-6 sm:h-7 min-w-[38px] sm:min-w-[48px] rounded-md px-1 text-center text-[11px] sm:text-xs font-bold tabular-nums text-foreground transition-colors hover:bg-muted"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
              disabled={zoom >= 2.5}
              aria-label="Zoom in"
              title="Zoom in"
              className={iconBtn}
            >
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Scroll Canvas — minimal padding on mobile for maximum Quran text size */}
      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-auto bg-muted/40 p-1 sm:p-3 md:p-4"
      >
        {errored ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Couldn&apos;t load this PDF.
          </div>
        ) : ready && file ? (
          <div ref={pageContainerRef} className="flex justify-center">
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
              <div
                className="relative flex justify-center"
                style={{ width: pageWidth, height: pageHeight }}
              >
                <BufferedPdfPage
                  page={slots[0]}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  visible={activeSlot === 0}
                  onRendered={() => onSlotRendered(0)}
                  pointer={activePointer}
                  onPageClick={handlePageClick}
                  allowPointing={allowPointing}
                />
                <BufferedPdfPage
                  page={slots[1]}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  visible={activeSlot === 1}
                  onRendered={() => onSlotRendered(1)}
                  pointer={activePointer}
                  onPageClick={handlePageClick}
                  allowPointing={allowPointing}
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
