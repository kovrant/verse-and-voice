// class_time is stored as "h:mm AM/PM PKT" (Asia/Karachi, fixed UTC+5, no DST).
const PKT_OFFSET_MIN = 5 * 60

/** Parse stored class_time ("8:00 AM PKT") into 12h parts. Empty/invalid → blanks. */
export function parseTime(val: string): { hour: string; minute: string; period: string } {
  if (!val) return { hour: "", minute: "", period: "" }
  const match = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (match) {
    return { hour: match[1], minute: match[2], period: match[3].toUpperCase() }
  }
  return { hour: "", minute: "", period: "" }
}

/** Native `<input type="time">` value ("HH:mm") → stored "h:mm AM/PM PKT". */
export function toPktClassTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return ""
  const h24 = Number(m[1])
  const min = m[2]
  if (h24 < 0 || h24 > 23) return ""
  const period = h24 >= 12 ? "PM" : "AM"
  const hour12 = h24 % 12 || 12
  return `${hour12}:${min} ${period} PKT`
}

/** Stored "h:mm AM/PM PKT" → native `<input type="time">` value ("HH:mm"). */
export function toInputTime(pkt: string): string {
  const { hour, minute, period } = parseTime(pkt)
  if (!hour || !minute || !period) return ""
  let h = Number(hour) % 12
  if (period === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${minute}`
}

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
