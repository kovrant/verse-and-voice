// Shared helpers for the notifications feed (bell + full page).

/**
 * Strip characters that would break PostgREST's `.or(...)` ilike filter
 * (commas separate conditions; parens group them; % / _ are ilike wildcards).
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%_]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * ISO timestamp for the retention boundary: notifications older than this are
 * hidden from every feed (and physically purged by the pg_cron job). Keeps the
 * client filter and the DB job on the same "2 months" definition.
 */
export function retentionCutoffIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setMonth(d.getMonth() - 2)
  return d.toISOString()
}
