import { type ClassValue, clsx } from "clsx"
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
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  const fallback = new Date(value)
  return isNaN(fallback.getTime()) ? null : fallback
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
