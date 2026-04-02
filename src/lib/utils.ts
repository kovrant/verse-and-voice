import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export const STATUS_CONFIG: Record<StudentStatus, { label: string; variant: "success" | "secondary" | "warning" }> = {
  Reading: { label: "Reading", variant: "success" },
  Completed: { label: "Completed", variant: "secondary" },
  "Left Uncompleted": { label: "Left Uncompleted", variant: "warning" },
}
