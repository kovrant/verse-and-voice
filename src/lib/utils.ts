import { type ClassValue, clsx } from "clsx"
import { format, formatDistanceToNow } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date-only string ("YYYY-MM-DD") as a LOCAL date.
 * `new Date("2024-01-01")` is parsed as UTC midnight, which renders as the
 * previous day in negative-offset timezones. This builds the date in local time.
 * Datetime strings (containing "T") and other inputs fall back to `new Date`.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [, y, m, d] = match
    const parsed = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const fallback = new Date(value)
  return isNaN(fallback.getTime()) ? null : fallback
}

/**
 * Safely format a date or timestamp string without ever throwing `RangeError: Invalid time value`.
 */
export function safeFormatDate(
  value: Date | string | number | null | undefined,
  fmt: string,
  fallback = "—",
): string {
  if (!value) return fallback
  try {
    const d =
      value instanceof Date
        ? value
        : typeof value === "string"
          ? parseLocalDate(value) ?? new Date(value)
          : new Date(value)
    if (isNaN(d.getTime())) return fallback
    return format(d, fmt)
  } catch {
    return fallback
  }
}

/**
 * Safely format relative distance to now without ever throwing `RangeError: Invalid time value`.
 */
export function safeFormatDistanceToNow(
  value: Date | string | number | null | undefined,
  options?: { addSuffix?: boolean },
  fallback = "recently",
): string {
  if (!value) return fallback
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (isNaN(d.getTime())) return fallback
    return formatDistanceToNow(d, options)
  } catch {
    return fallback
  }
}

/**
 * Format a Date as a local "YYYY-MM-DD" string (no UTC shift).
 * Use instead of `toISOString().split("T")[0]`, which can roll over to the next
 * day in negative-offset timezones.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Human-readable class-session length: "45s", "12m", "1h", "2h 15m". */
export function formatSessionDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s}s`
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs",
  USD: "$",
  GBP: "£",
  SAR: "﷼",
  BHD: "BD",
}

export const COUNTRIES = [
  "Pakistan",
  "United Kingdom",
  "United States",
  "Saudi Arabia",
  "Bahrain",
  "UAE",
  "Canada",
  "Australia",
  "Other",
]

export type StudentStatus = "Reading" | "Completed" | "Left Uncompleted"

export const STATUS_CONFIG: Record<
  StudentStatus,
  { label: string; variant: "success" | "secondary" | "warning" }
> = {
  Reading: { label: "Reading", variant: "success" },
  Completed: { label: "Completed", variant: "secondary" },
  "Left Uncompleted": { label: "Left Uncompleted", variant: "warning" },
}

/** Full `students` row. */
export interface Student {
  id: string
  name: string
  guardian_name: string
  country: string | null
  started_at: string
  ended_at: string | null
  status: StudentStatus
  fee: number
  fee_currency: string
  class_time: string | null
  /** 0=Sun … 6=Sat. Empty/null = teacher hasn't configured days yet. */
  class_days: number[] | null
  /** Assigned Qaida (media_library id), or null if none. */
  qaida_media_id?: string | null
  /** Student's detected hardware / device (e.g. iPad 10.9", MacBook). */
  last_device?: string | null
  last_device_at?: string | null
  created_at: string
}

/** Full `fee_payments` row. */
export interface FeePayment {
  id: string
  student_id: string
  month: number
  year: number
  is_paid: boolean
  paid_at: string | null
}

/** Fee row with the joined student fields used by dashboard / fees admin. */
export type FeePaymentWithStudent = FeePayment & {
  students: {
    name: string
    fee: number
    fee_currency: string
    status: string
  }
}
