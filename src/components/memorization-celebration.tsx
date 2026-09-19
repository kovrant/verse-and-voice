"use client"

/* eslint-disable @next/next/no-img-element -- remote Supabase URLs; next/image isn't worth it here */

import { Sparkles, Star, X } from "lucide-react"
import { useEffect } from "react"

import { KidButton, KidModal, QuranBookIcon } from "@/components/kid-ui"

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
          className="star-burst absolute left-1/2 top-1/2 text-[hsl(var(--kid-saffron))]"
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
  // The crayon box: saffron, sage, coral, sky, lavender, teal.
  color: ["#E3B04B", "#8FA97A", "#D98363", "#7FA3B8", "#9D8BB5", "#6FA3A0"][i % 6],
}))

/*
 * Passed to KidModal as `extra`, so it renders in the dialog's portal but outside
 * the translate-centred card: a transformed ancestor makes `fixed` resolve
 * against it, and the confetti would fall inside the card instead of the screen.
 */
function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
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
        <div
          className="celebrate-pop pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-[24px] border-[1.5px] border-[hsl(var(--kid-sage)/0.55)] p-3 pr-10 shadow-[0_5px_0_hsl(var(--kid-sage)/0.55),0_18px_36px_-16px_rgba(0,0,0,0.3)]"
          style={{
            background:
              "linear-gradient(100deg, hsl(var(--kid-sage) / 0.3), hsl(var(--kid-sage) / 0.08)), hsl(var(--card))",
          }}
        >
          <div className="relative flex-shrink-0">
            <StarBurst />
            {/* The page stays visible — a child should see which one they just
                finished — with the tick as a badge over its corner. */}
            <div className="relative h-16 w-16 overflow-hidden rounded-[16px] border-[1.5px] border-border bg-white">
              <img src={current.imageUrl} alt="" className="h-full w-full object-contain p-1" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card">
              <DrawnCheck className="h-4 w-4" />
            </span>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-heading text-[17px] font-bold text-primary">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-[hsl(var(--kid-saffron))]" />
              {current.label} memorized!
            </p>
            <p className="truncate text-[13px] font-semibold text-muted-foreground">
              {current.lessonTitle} — {current.done} of {current.total} parts done
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <KidModal
      open
      onOpenChange={(open) => !open && onDismiss()}
      color="saffron"
      extra={<Confetti />}
      hero={
        <span className="relative flex h-28 w-28 items-center justify-center">
          <StarBurst />
          <span className="medal-drop relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[hsl(var(--kid-saffron)/0.45)] blur-xl" />
            <span className="relative flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-white/70 bg-gradient-to-br from-[hsl(var(--kid-saffron)/0.5)] to-[hsl(var(--kid-saffron))] text-6xl shadow-[0_5px_0_hsl(36_60%_42%)]">
              🏅
            </span>
          </span>
        </span>
      }
      title="MashaAllah!"
      description={
        <>
          You memorized <span className="font-extrabold text-foreground">{current.title}</span>
          {" — "}all {current.total} parts.
        </>
      }
    >
      {current.imageUrl && (
        <img
          src={current.imageUrl}
          alt=""
          className="mx-auto max-h-32 w-full rounded-[20px] border-[1.5px] border-border bg-white object-contain p-2"
        />
      )}
      <KidButton
        href="/student/progress"
        onClick={onDismiss}
        pad={<QuranBookIcon className="h-7 w-7" />}
      >
        See my progress
      </KidButton>
      <KidButton variant="soft" onClick={onDismiss}>
        Keep going
      </KidButton>
    </KidModal>
  )
}
