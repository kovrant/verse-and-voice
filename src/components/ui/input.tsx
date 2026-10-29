import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Teacher portal: NextAdmin input. kid: keeps the student input.
          "flex h-11 w-full rounded-lg border border-input-border bg-input-background px-4 py-2 text-sm text-foreground transition-all duration-200",
          "kid:rounded-xl kid:border-input kid:bg-card",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-input-placeholder-text kid:placeholder:text-muted-foreground/60",
          "kid:hover:border-[hsl(var(--border-strong))]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary",
          "kid:focus-visible:ring-2 kid:focus-visible:ring-emerald-500/30 kid:focus-visible:border-emerald-500/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
