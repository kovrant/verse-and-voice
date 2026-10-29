import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-background-gray-tertiary kid:h-3 kid:bg-secondary",
        className,
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out kid:bg-gradient-to-r kid:from-emerald-500 kid:to-teal-400"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {/* Glow on the tip (student only) */}
      <div
        className="absolute top-0 hidden h-full w-4 rounded-full bg-emerald-400/40 blur-sm transition-all duration-500 kid:block"
        style={{ left: `calc(${Math.min(100, Math.max(0, value))}% - 8px)` }}
      />
    </div>
  ),
)
Progress.displayName = "Progress"

export { Progress }
