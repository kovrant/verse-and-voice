import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-3 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {/* Glow on the tip */}
      <div
        className="absolute top-0 h-full w-4 rounded-full bg-emerald-400/40 blur-sm transition-all duration-500"
        style={{ left: `calc(${Math.min(100, Math.max(0, value))}% - 8px)` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
