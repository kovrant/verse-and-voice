"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {from}–{to} of {totalItems}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-border/50 bg-secondary/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <PaginationButton
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </PaginationButton>
        <PaginationButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationButton>

        {getPageNumbers(currentPage, totalPages).map((page, i) =>
          page === "..." ? (
            <span key={`dots-${i}`} className="px-1.5 text-muted-foreground/40 text-sm">
              ...
            </span>
          ) : (
            <PaginationButton
              key={page}
              onClick={() => onPageChange(page as number)}
              active={page === currentPage}
            >
              {page}
            </PaginationButton>
          )
        )}

        <PaginationButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>
        <PaginationButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </PaginationButton>
      </div>
    </div>
  )
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
  ...props
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-sm transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400 font-semibold"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "pointer-events-none opacity-30"
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = [1]

  if (current > 3) pages.push("...")

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push("...")

  pages.push(total)
  return pages
}
