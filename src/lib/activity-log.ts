"use client"

// Client-side activity logging for the student portal.
//
// Every meaningful interaction (page view, click, para open, PDF page turn) is
// buffered here and flushed to /api/activity in batches. Batching avoids one
// network request per click when a child taps around rapidly. A flush is
// triggered when the buffer fills, on a short interval, and — critically — when
// the tab is hidden/unloaded (via navigator.sendBeacon) so the *last* clicks
// before a navigation aren't lost.
//
// The API route derives student_id from the session cookie; we never send it
// from the client, so events can't be attributed to the wrong student.

import { usePathname } from "next/navigation"
import { useEffect } from "react"

export interface ActivityEvent {
  event_type: "page_view" | "link_click" | "click" | "para_open" | "pdf_page"
  path?: string | null
  label?: string | null
  href?: string | null
  meta?: Record<string, unknown>
  /** Client timestamp (ISO). Authoritative for ordering the timeline. */
  occurred_at: string
}

const ENDPOINT = "/api/activity"
const MAX_BUFFER = 20 // flush once this many events queue up
const FLUSH_INTERVAL_MS = 4000 // …or at least this often

let buffer: ActivityEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

function truncate(text: string | null | undefined, max = 120): string | null {
  if (!text) return null
  const trimmed = text.replace(/\s+/g, " ").trim()
  if (!trimmed) return null
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

/** Send the current buffer. Uses sendBeacon on unload, fetch otherwise. */
function flush(useBeacon = false): void {
  if (buffer.length === 0) return
  const events = buffer
  buffer = []
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  const payload = JSON.stringify({ events })

  if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    // Beacons must be same-origin and carry cookies automatically.
    const ok = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }))
    if (ok) return
    // Fall through to fetch if the beacon was rejected (e.g. payload too big).
  }

  // keepalive lets the request outlive a page navigation.
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Logging is best-effort; never disrupt the student's session on failure.
  })
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

/** Queue a single activity event. */
export function logActivity(
  event: Omit<ActivityEvent, "occurred_at"> & { occurred_at?: string },
): void {
  if (typeof window === "undefined") return
  buffer.push({
    ...event,
    path: event.path ?? window.location.pathname,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
  })
  if (buffer.length >= MAX_BUFFER) flush()
  else scheduleFlush()
}

/** Walk up from an event target to the nearest actionable element. */
function describeClickTarget(target: EventTarget | null): {
  event_type: "link_click" | "click"
  label: string | null
  href: string | null
  meta: Record<string, unknown>
} | null {
  if (!(target instanceof Element)) return null

  const anchor = target.closest("a")
  const actionable = target.closest("a,button,[role='button'],[role='link']")
  const el = (actionable as HTMLElement | null) ?? (target as HTMLElement)

  const label =
    el.getAttribute("aria-label") ||
    truncate(el.textContent) ||
    el.getAttribute("title") ||
    (el as HTMLImageElement).alt ||
    null

  let href: string | null = null
  if (anchor) {
    // Store the pathname (+ search) rather than the absolute URL for readability.
    const raw = anchor.getAttribute("href")
    href = raw ? raw : anchor.pathname + anchor.search
  }

  return {
    event_type: anchor ? "link_click" : "click",
    label,
    href,
    meta: {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      role: el.getAttribute("role") || undefined,
    },
  }
}

function bindGlobalListeners(): () => void {
  if (listenersBound) return () => {}
  listenersBound = true

  const onClick = (e: MouseEvent) => {
    const info = describeClickTarget(e.target)
    if (!info) return
    logActivity({
      event_type: info.event_type,
      label: info.label,
      href: info.href,
      meta: { ...info.meta, x: Math.round(e.clientX), y: Math.round(e.clientY) },
    })
  }

  const onHide = () => {
    if (document.visibilityState === "hidden") flush(true)
  }
  const onPageHide = () => flush(true)

  // Capture phase so we still record clicks that call stopPropagation().
  document.addEventListener("click", onClick, { capture: true })
  document.addEventListener("visibilitychange", onHide)
  window.addEventListener("pagehide", onPageHide)

  return () => {
    document.removeEventListener("click", onClick, { capture: true })
    document.removeEventListener("visibilitychange", onHide)
    window.removeEventListener("pagehide", onPageHide)
    listenersBound = false
  }
}

/**
 * Mount once (in the student layout). Logs a page_view on every route change
 * and wires the global click + unload listeners.
 */
export function useActivityLogger(): void {
  const pathname = usePathname()

  useEffect(() => {
    const unbind = bindGlobalListeners()
    return unbind
  }, [])

  useEffect(() => {
    if (!pathname) return
    logActivity({ event_type: "page_view", path: pathname })
  }, [pathname])
}
