import type { ReactNode } from "react"
import { BookOpen } from "lucide-react"

import { cn } from "@/lib/utils"

/** Shimmer block — use anywhere a placeholder bar/card is needed. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer", className)} aria-hidden="true" />
}

function HeaderSkeleton({
  subtitle = true,
  action = false,
  student = false,
}: {
  subtitle?: boolean
  action?: boolean
  student?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        student ? "mb-0" : "mb-0",
      )}
    >
      <div className="space-y-2.5 min-w-0 flex-1">
        <Skeleton className={cn("h-8 rounded-xl", student ? "w-56" : "w-48")} />
        {subtitle && <Skeleton className="h-4 w-72 max-w-full rounded-lg" />}
      </div>
      {action && <Skeleton className="h-11 w-36 shrink-0 rounded-xl" />}
    </div>
  )
}

export type PageLoadingVariant =
  | "dashboard"
  | "grid-dense"
  | "grid-cards"
  | "list"
  | "detail"
  | "class-session"
  | "stacked"
  | "student-home"
  | "student-article"
  | "student-simple"
  | "pdf"
  | "rows"
  | "media"
  | "widget-book"
  | "widget-mem"
  | "pill"

/**
 * Page-shaped skeleton loaders — one component, many layouts. Replaces the
 * copy-pasted shimmer blocks scattered across pages.
 */
export function PageLoading({
  variant,
  className,
  count,
  student = false,
}: {
  variant: PageLoadingVariant
  className?: string
  count?: number
  /** Wrap in the student portal's max-width container. */
  student?: boolean
}) {
  const wrap = (node: ReactNode) => (
    <div
      className={cn(
        "space-y-6 animate-fade-in-up",
        student && "mx-auto max-w-5xl",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      {node}
      <span className="sr-only">Loading…</span>
    </div>
  )

  switch (variant) {
    case "dashboard":
      return wrap(
        <>
          <HeaderSkeleton />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count ?? 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </>,
      )

    case "grid-dense":
      return wrap(
        <>
          <HeaderSkeleton student={student} />
          <div
            className={cn(
              "grid gap-3",
              student
                ? "gap-4"
                : "grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10",
            )}
            style={
              student
                ? { gridTemplateColumns: "repeat(auto-fill, minmax(196px, 1fr))" }
                : undefined
            }
          >
            {Array.from({ length: count ?? 30 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("rounded-2xl", student ? "h-[196px]" : "aspect-square")}
              />
            ))}
          </div>
        </>,
      )

    case "grid-cards":
      return wrap(
        <>
          <HeaderSkeleton student={student} />
          {!student && <Skeleton className="h-14 w-full max-w-xl rounded-2xl" />}
          <div
            className={cn(
              "grid gap-4",
              student ? "gap-[22px] sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {Array.from({ length: count ?? 6 }).map((_, i) => (
              <Skeleton key={i} className={cn("rounded-2xl", student ? "h-64" : "h-56")} />
            ))}
          </div>
        </>,
      )

    case "list":
      return wrap(
        <>
          <HeaderSkeleton action />
          <Skeleton className="h-11 w-full max-w-md rounded-xl" />
          {Array.from({ length: count ?? 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </>,
      )

    case "detail":
      return wrap(
        <>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-4 w-64 rounded-lg" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </>,
      )

    case "class-session":
      return wrap(
        <>
          <HeaderSkeleton />
          <Skeleton className="h-11 w-full max-w-sm rounded-xl" />
          <Skeleton className="mx-auto h-80 max-w-2xl w-full rounded-2xl" />
        </>,
      )

    case "stacked":
      return wrap(
        <>
          <HeaderSkeleton />
          <Skeleton className="h-24 rounded-2xl" />
          {Array.from({ length: count ?? 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </>,
      )

    case "student-home":
      return wrap(
        <>
          <Skeleton className="h-11 w-64 rounded-xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid gap-[22px] sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </>,
      )

    case "student-article":
      return wrap(
        <>
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-10 w-2/3 rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: count ?? 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        </>,
      )

    case "student-simple":
      return wrap(
        <>
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </>,
      )

    case "pdf":
      return wrap(
        <>
          <Skeleton className="h-11 w-48 rounded-xl" />
          <Skeleton className="h-[70vh] rounded-2xl" />
        </>,
      )

    case "rows":
      return (
        <div className={cn("space-y-3 animate-fade-in-up", className)} role="status" aria-label="Loading">
          {Array.from({ length: count ?? 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
          <span className="sr-only">Loading…</span>
        </div>
      )

    case "media":
      return wrap(
        <>
          <HeaderSkeleton action />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: count ?? 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        </>,
      )

    case "widget-book":
      return (
        <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
          <Skeleton className="mb-4 h-3 w-24 rounded" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-32 w-24 shrink-0 rounded-[6px_12px_12px_6px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-[14px]" />
        </div>
      )

    case "widget-mem":
      return (
        <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
          <Skeleton className="mb-4 h-3 w-32 rounded" />
          <div className="flex items-center gap-[18px]">
            <Skeleton className="h-[104px] w-[104px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-[14px]" />
        </div>
      )

    case "pill":
      return <Skeleton className={cn("h-8 w-28 rounded-full", className)} />

    default:
      return wrap(<HeaderSkeleton />)
  }
}

/** Compact branded loader for PDF viewers and dynamic imports. */
export function InlineLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 animate-fade-in-up"
      role="status"
      aria-label={label}
    >
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-soft book-open-anim">
        <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary loading-dot"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
