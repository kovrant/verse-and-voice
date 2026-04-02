"use client"

import { cn } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export type SortDirection = "asc" | "desc" | null

interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSort: string | null
  currentDirection: SortDirection
  onSort: (key: string) => void
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors group",
        isActive ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      <span className="flex-shrink-0">
        {isActive && currentDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : isActive && currentDirection === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </button>
  )
}

export function useSorting<T>(
  data: T[],
  defaultKey?: string,
  defaultDirection?: SortDirection
) {
  // This is a utility — use it with useState in the component
}

export function sortData<T>(
  data: T[],
  sortKey: string | null,
  direction: SortDirection
): T[] {
  if (!sortKey || !direction) return data

  return [...data].sort((a, b) => {
    const aVal = (a as any)[sortKey]
    const bVal = (b as any)[sortKey]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return direction === "asc" ? -1 : 1
    if (bVal == null) return direction === "asc" ? 1 : -1

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal
    }

    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    const cmp = aStr.localeCompare(bStr)
    return direction === "asc" ? cmp : -cmp
  })
}

export function toggleSort(
  currentKey: string | null,
  currentDirection: SortDirection,
  newKey: string
): { key: string; direction: SortDirection } {
  if (currentKey !== newKey) return { key: newKey, direction: "asc" }
  if (currentDirection === "asc") return { key: newKey, direction: "desc" }
  return { key: newKey, direction: null }
}
