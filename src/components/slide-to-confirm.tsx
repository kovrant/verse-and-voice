"use client"

import { ChevronsRight, Loader2 } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const KNOB = 48 // px, knob diameter
const PAD = 4 // px, gap between knob and track edge
const THRESHOLD = 0.9 // fraction of the track to release past to confirm

const TONES = {
  green: {
    track: "bg-green-500/10",
    fill: "bg-green-500/20",
    knob: "bg-green-600 text-white",
    text: "#16a34a",
  },
  red: {
    track: "bg-destructive/10",
    fill: "bg-destructive/20",
    knob: "bg-destructive text-destructive-foreground",
    text: "hsl(var(--destructive))",
  },
} as const

/**
 * Slide-to-confirm: drag the knob to the right end to run `onConfirm`. Released
 * early it springs back. Keyboard: Enter, Space or → on the knob confirms.
 */
export function SlideToConfirm({
  label,
  tone,
  onConfirm,
  disabled,
}: {
  label: string
  tone: keyof typeof TONES
  onConfirm: () => Promise<unknown> | void
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const startRef = useRef(0)
  const [maxX, setMaxX] = useState(0)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const t = TONES[tone]

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setMaxX(Math.max(0, el.clientWidth - KNOB - PAD * 2))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function confirm() {
    if (busy || disabled) return
    setX(maxX)
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setX(0)
    }
  }

  const progress = maxX ? x / maxX : 0
  const locked = disabled || busy

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-14 w-full select-none overflow-hidden rounded-full",
        t.track,
        disabled && "opacity-50",
      )}
    >
      {/* Fill that follows the knob */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          t.fill,
          !dragging && "transition-[width] duration-300 ease-out",
        )}
        style={{ width: x + KNOB + PAD * 2 }}
      />

      {/* Label with a moving shine, fading as the knob travels */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 pr-4 text-sm font-medium"
        style={{ opacity: 1 - progress }}
      >
        {/* Gradient text: the base colour must be explicit (currentColor would be transparent) */}
        <span
          className="animate-text-shine bg-[length:250%_100%] bg-clip-text text-transparent motion-reduce:animate-none"
          style={{
            backgroundImage: `linear-gradient(110deg, ${t.text} 40%, rgba(255,255,255,0.85) 50%, ${t.text} 60%)`,
          }}
        >
          {label}
        </span>
      </span>

      {/* Knob */}
      <button
        type="button"
        aria-label={label}
        disabled={locked}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
            e.preventDefault()
            void confirm()
          }
        }}
        onPointerDown={(e) => {
          if (locked) return
          e.currentTarget.setPointerCapture(e.pointerId)
          startRef.current = e.clientX - x
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (!dragging) return
          setX(Math.min(maxX, Math.max(0, e.clientX - startRef.current)))
        }}
        onPointerUp={() => {
          if (!dragging) return
          setDragging(false)
          if (x >= maxX * THRESHOLD) void confirm()
          else setX(0)
        }}
        onPointerCancel={() => {
          setDragging(false)
          setX(0)
        }}
        className={cn(
          "absolute flex touch-none items-center justify-center rounded-full shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed",
          t.knob,
          dragging ? "cursor-grabbing" : "cursor-grab",
          !dragging && "transition-transform duration-300 ease-out",
        )}
        style={{
          width: KNOB,
          height: KNOB,
          top: PAD,
          left: PAD,
          transform: `translateX(${x}px)`,
        }}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ChevronsRight className="h-5 w-5" />
        )}
      </button>
    </div>
  )
}
