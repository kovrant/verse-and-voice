"use client"

/* eslint-disable @next/next/no-img-element -- remote Supabase URLs; next/image isn't worth it here */

import { Sparkles, Star, X } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"

/** A win worth showing the student. */
export type Celebration =
  | {
      kind: "part"
      /** chunk id — also the queue key */
      id: string
      label: string
      imageUrl: string
      lessonTitle: string
      done: number
      total: number
    }
  | {
      kind: "lesson"
      /** catalog id — also the queue key */
      id: string
      title: string
      imageUrl: string | null
      total: number
    }

const PART_VISIBLE_MS = 5000

/** Ten stars flung evenly outward. Fixed angles, so server and client agree. */
const STARS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2
  return {
    x: `${Math.round(Math.cos(angle) * 58)}px`,
    y: `${Math.round(Math.sin(angle) * 58)}px`,
    delay: `${i * 35}ms`,
  }
})

function StarBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star-burst absolute left-1/2 top-1/2 text-amber-400"
          style={
            {
              "--burst-x": s.x,
              "--burst-y": s.y,
              animationDelay: s.delay,
            } as React.CSSProperties
          }
        >
          <Star className="h-3.5 w-3.5 fill-current" />
        </span>
      ))}
    </span>
  )
}

/** A tick that draws itself on. */
function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12.5 L10 17.5 L19 7"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-draw"
      />
    </svg>
  )
}

/* 18 pieces on deterministic tracks — Math.random() here would differ between
   the server and client renders and trip a hydration mismatch. */
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.7 + (i % 3) * 9) % 96}%`,
  delay: `${(i % 6) * 180}ms`,
  fall: `${2600 + (i % 5) * 400}ms`,
  spin: `${((i % 4) + 1) * 360}deg`,
  color: ["#f6c46a", "#7d9c84", "#e8927c", "#9db8d6"][i % 4],
}))

/*
 * Rendered through the dialog's portal rather than inside its content: the
 * content is translate-centred, and a transformed ancestor makes `fixed`
 * resolve against it — the confetti would fall inside the little card instead
 * of across the screen.
 */
function Confetti() {
  return (
    <span
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block h-2.5 w-2 rounded-[2px]"
          style={
            {
              left: c.left,
              background: c.color,
              "--delay": c.delay,
              "--fall": c.fall,
              "--spin": c.spin,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}

/**
 * The achievement moment for the student memorization page.
 *
 * A finished part is a passing cheer: it sits above the content, announces
 * itself politely to screen readers and clears itself, so a child who has
 * wandered off doesn't come back to a blocked screen. A finished lesson is a
 * bigger deal and takes over as a proper dialog with a way onward.
 */
export function MemCelebration({
  current,
  onDismiss,
}: {
  current: Celebration | null
  onDismiss: () => void
}) {
  const isPart = current?.kind === "part"

  // Part wins clear themselves; lesson wins wait to be acknowledged.
  useEffect(() => {
    if (!isPart) return
    const t = setTimeout(onDismiss, PART_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [isPart, current?.id, onDismiss])

  if (!current) return null

  if (current.kind === "part") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
      >
        <div className="celebrate-pop pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-card to-card p-3 pr-10 shadow-soft-lg">
          <div className="relative flex-shrink-0">
            <StarBurst />
            {/* The page stays visible — a child should see which one they just
                finished — with the tick as a badge over its corner. */}
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-white">
              <img src={current.imageUrl} alt="" className="h-full w-full object-contain p-1" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-card">
              <DrawnCheck className="h-4 w-4" />
            </span>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-heading text-base font-extrabold text-foreground">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-500" />
              {current.label} memorized!
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {current.lessonTitle} — {current.done} of {current.total} parts done
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogPortal>
        <Confetti />
      </DialogPortal>
      <DialogContent className="max-w-md bg-gradient-to-b from-amber-500/15 to-card text-center">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="relative mx-auto mb-1 flex h-28 w-28 items-center justify-center">
            <StarBurst />
            <span className="medal-drop relative flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-400/35 blur-xl" />
              <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 text-6xl shadow-lg ring-4 ring-amber-300/40">
                🏅
              </span>
            </span>
          </div>
          <DialogTitle className="font-heading text-3xl">MashaAllah!</DialogTitle>
          <DialogDescription className="text-base">
            You memorized <span className="font-bold text-foreground">{current.title}</span> —
            all {current.total} parts.
          </DialogDescription>
        </DialogHeader>

        {current.imageUrl && (
          <img
            src={current.imageUrl}
            alt=""
            className="mx-auto max-h-32 w-full rounded-xl bg-white object-contain p-2"
          />
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onDismiss}
            className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary"
          >
            Keep going
          </button>
          <Link
            href="/student/progress"
            onClick={onDismiss}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))]"
          >
            See my progress
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
