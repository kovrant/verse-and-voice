"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

import { type MascotMood, MoonMascot } from "@/components/student-mascot"
import type { KidColor } from "@/components/student-nav"
import { cn } from "@/lib/utils"

/** Dark forest ink — stays readable on the bright sunrise gradient in both themes. */
const INK = "hsl(125 12% 16%)"

/** The open Quran from our logo, for button pads. */
export function QuranBookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g stroke="hsl(125 12% 20%)" strokeWidth="6" strokeLinejoin="round" fill="#FBF8F0">
        <path d="M50 30 C38 22 22 21 8 25 L8 78 C22 74 38 75 50 84 Z" />
        <path d="M50 30 C62 22 78 21 92 25 L92 78 C78 74 62 75 50 84 Z" />
      </g>
      <path d="M50 30 V84" stroke="hsl(125 12% 20%)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

type KidButtonProps = {
  children: ReactNode
  /** Icon on the white pad at the right end (primary only). */
  pad?: ReactNode
  variant?: "primary" | "soft"
  className?: string
} & (
  | { href: string; onClick?: () => void; type?: never; disabled?: never }
  | { href?: never; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }
)

/**
 * The student portal's chunky button. `primary` is the sunrise pill (coral →
 * saffron, shine sweep, optional icon pad); `soft` is the quiet secondary.
 * Pass `href` to render a link.
 */
export function KidButton({
  children,
  pad,
  variant = "primary",
  className,
  ...rest
}: KidButtonProps) {
  const primary = variant === "primary"
  const classes = cn(
    "group relative flex h-[58px] items-center justify-center overflow-hidden rounded-full font-heading text-[19px] font-bold transition-transform",
    "hover:-translate-y-0.5 active:translate-y-[4px] active:!shadow-none disabled:cursor-wait",
    // Soft coral focus outline instead of the global hard one (the modal auto-focuses
    // its first button). An outline, not a ring: the inline box-shadow would hide a ring.
    "focus-visible:[outline:3px_solid_hsl(var(--kid-coral)/0.55)] focus-visible:[outline-offset:3px]",
    primary
      ? "text-[hsl(125_12%_16%)]"
      : "border-[1.5px] border-border bg-card text-muted-foreground shadow-[0_4px_0_hsl(var(--border))] hover:text-foreground",
    className,
  )
  const style: CSSProperties | undefined = primary
    ? {
        color: INK,
        background: "linear-gradient(100deg, hsl(var(--kid-coral)), hsl(var(--kid-saffron)))",
        boxShadow: "0 5px 0 hsl(16 48% 44%), 0 14px 28px -12px hsl(var(--kid-coral) / 0.8)",
      }
    : undefined

  const inner = (
    <>
      {primary && (
        <span
          aria-hidden
          className="vv-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      )}
      <span className={cn("relative", primary && pad && "pr-10")}>{children}</span>
      {primary && pad && (
        <span
          aria-hidden
          className="absolute right-2 top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)]"
        >
          {pad}
        </span>
      )}
    </>
  )

  if (rest.href) {
    return (
      <Link href={rest.href} onClick={rest.onClick} className={classes} style={style}>
        {inner}
      </Link>
    )
  }
  return (
    <button
      type={rest.type ?? "button"}
      onClick={rest.onClick}
      disabled={rest.disabled}
      className={classes}
      style={style}
    >
      {inner}
    </button>
  )
}

/** A few doodles scattered across the modal's colour band. */
const BAND_DOODLES = [
  {
    top: "18%",
    left: "10%",
    size: 14,
    d: "M12 2l2.6 6.6L21 12l-6.4 3.4L12 22l-2.6-6.6L3 12l6.4-3.4z",
  },
  { top: "60%", left: "16%", size: 9, d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" },
  { top: "22%", left: "84%", size: 12, d: "M15 3a9 9 0 1 0 6 15.5A7.5 7.5 0 0 1 15 3z" },
  {
    top: "64%",
    left: "88%",
    size: 15,
    d: "M12 2l2.6 6.6L21 12l-6.4 3.4L12 22l-2.6-6.6L3 12l6.4-3.4z",
  },
]

/**
 * Storybook popup for the student portal: rounded card with a chunky coloured
 * edge, a colour band holding the `hero` (mascot, medal…), then title, text and
 * actions. Built on Radix Dialog, so focus trap, Escape and aria come for free.
 * `extra` renders inside the portal but outside the card (e.g. full-screen
 * confetti — `fixed` inside the transformed card would be clipped to it).
 */
export function KidModal({
  open,
  onOpenChange,
  color,
  hero,
  title,
  description,
  children,
  extra,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  color: KidColor
  hero: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  extra?: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(125_14%_10%/0.45)] backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {extra}
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{ "--kid": `var(--kid-${color})` } as CSSProperties}
        >
          <div className="celebrate-pop overflow-hidden rounded-[32px] border-[1.5px] border-[hsl(var(--kid)/0.5)] bg-card text-center shadow-[0_8px_0_hsl(var(--kid)/0.55),0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            {/* Colour band with the hero */}
            <div
              className="relative flex justify-center px-6 pb-4 pt-7"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--kid) / 0.4), hsl(var(--kid) / 0.12))",
              }}
            >
              {BAND_DOODLES.map((d, i) => (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  width={d.size}
                  height={d.size}
                  aria-hidden
                  className={cn(
                    "absolute",
                    i % 2 ? "animate-float-reverse" : "animate-float-gentle",
                  )}
                  style={{ top: d.top, left: d.left, fill: "hsl(var(--kid) / 0.9)" }}
                >
                  <path d={d.d} />
                </svg>
              ))}
              {hero}
            </div>

            <div className="px-6 pb-6 pt-3">
              <DialogPrimitive.Title className="font-heading text-[27px] font-bold leading-tight text-primary">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mx-auto mt-1.5 max-w-[19rem] text-[15px] font-semibold leading-snug text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title}
                </DialogPrimitive.Description>
              )}
              {children && <div className="mt-5 flex flex-col gap-3">{children}</div>}
            </div>
          </div>

          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-soft transition-colors hover:bg-card hover:text-foreground"
          >
            <X className="h-[18px] w-[18px]" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Inline style that tints a storybook surface in a crayon colour. */
function kidVar(color: KidColor): CSSProperties {
  return { "--kid": `var(--kid-${color})` } as CSSProperties
}

/**
 * Student page header: big emoji tile in the section's crayon colour (the same
 * colour as its home card), a Baloo title and a friendly one-liner. `right`
 * holds page-level actions or a summary.
 */
export function KidPageHeader({
  emoji,
  color,
  title,
  subtitle,
  right,
  className,
}: {
  emoji: string
  color: KidColor
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("mb-6 flex flex-wrap items-center justify-between gap-4", className)}
      style={kidVar(color)}
    >
      <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
        <span
          aria-hidden
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border-[1.5px] border-[hsl(var(--kid)/0.5)] bg-[hsl(var(--kid)/0.3)] text-[30px] shadow-[0_4px_0_hsl(var(--kid)/0.5)] sm:h-16 sm:w-16 sm:text-[34px]"
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <h1 className="font-heading text-[28px] font-bold leading-none tracking-tight text-primary sm:text-[34px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[14px] font-semibold leading-snug text-muted-foreground sm:text-[15px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  )
}

/**
 * Storybook surface: rounded card with a chunky bottom edge. With `color` it
 * gets a soft crayon tint and matching edge; without, it's a plain white card
 * with a neutral edge.
 */
export function KidCard({
  color,
  className,
  children,
  style,
}: {
  color?: KidColor
  className?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        "rounded-[26px] border-[1.5px] p-4 sm:p-5",
        color
          ? "border-[hsl(var(--kid)/0.45)] shadow-[0_5px_0_hsl(var(--kid)/0.5)]"
          : "border-border bg-card shadow-[0_5px_0_hsl(var(--border))]",
        className,
      )}
      style={
        color
          ? {
              ...kidVar(color),
              background:
                "linear-gradient(160deg, hsl(var(--kid) / 0.22), hsl(var(--kid) / 0.08)), hsl(var(--card))",
              ...style,
            }
          : style
      }
    >
      {children}
    </div>
  )
}

/**
 * Friendly empty / error state with Hilal the moon. Use in place of the old
 * "🙈 We couldn't load…" boxes.
 */
export function KidEmpty({
  title,
  text,
  mood = "awake",
  children,
}: {
  title: ReactNode
  text?: ReactNode
  mood?: MascotMood
  children?: ReactNode
}) {
  return (
    <KidCard className="mx-auto mt-8 flex max-w-md flex-col items-center px-6 py-9 text-center">
      <MoonMascot mood={mood} className="h-24 w-24 animate-float-gentle" />
      <p className="mt-3 font-heading text-[22px] font-bold leading-tight text-primary">{title}</p>
      {text && <p className="mt-1.5 text-[15px] font-semibold text-muted-foreground">{text}</p>}
      {children && <div className="mt-5 w-full">{children}</div>}
    </KidCard>
  )
}
