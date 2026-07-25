import { parseTime } from "@/components/ui/time-picker"

// class_time is authored in PKT (the time picker always tags values "… PKT").
// Asia/Karachi is a fixed UTC+5 with no DST, so we can treat it as a constant offset.
const PKT_OFFSET_MIN = 5 * 60

function pktParts(now: Date): { y: number; m: number; d: number; dow: number } {
  const pkt = new Date(now.getTime() + PKT_OFFSET_MIN * 60_000)
  return {
    y: pkt.getUTCFullYear(),
    m: pkt.getUTCMonth(),
    d: pkt.getUTCDate(),
    dow: pkt.getUTCDay(), // 0=Sun … 6=Sat in PKT calendar
  }
}

function pktWallToUtcMs(y: number, m: number, d: number, h: number, min: number): number {
  return Date.UTC(y, m, d, h, min) - PKT_OFFSET_MIN * 60_000
}

/**
 * Next class instant. If `classDays` is set, only those weekdays count;
 * otherwise falls back to daily recurrence (legacy).
 */
export function nextClassInstant(
  classTime: string | null,
  now: Date = new Date(),
  classDays?: number[] | null,
): Date | null {
  const { hour, minute, period } = parseTime(classTime || "")
  if (!hour || !minute || !period) return null

  let h = parseInt(hour, 10) % 12
  if (period.toUpperCase() === "PM") h += 12
  const min = parseInt(minute, 10)

  const { y, m, d, dow } = pktParts(now)
  const scheduled =
    classDays && classDays.length > 0
      ? new Set(classDays.filter((x) => x >= 0 && x <= 6))
      : null

  // Look ahead up to 8 days so we always find the next matching weekday.
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(Date.UTC(y, m, d + offset))
    const dayDow = (dow + offset) % 7
    if (scheduled && !scheduled.has(dayDow)) continue

    const target = pktWallToUtcMs(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      h,
      min,
    )
    if (target > now.getTime()) return new Date(target)
  }
  return null
}

export function msUntilNextClass(
  classTime: string | null,
  now: Date = new Date(),
  classDays?: number[] | null,
): number | null {
  const next = nextClassInstant(classTime, now, classDays)
  return next ? next.getTime() - now.getTime() : null
}

/** Class time in the student's browser timezone. */
export function formatClassTimeLocal(
  classTime: string | null,
  now: Date = new Date(),
  classDays?: number[] | null,
): string | null {
  const next = nextClassInstant(classTime, now, classDays)
  if (!next) return null
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(next)
}

export function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return "now"
}
