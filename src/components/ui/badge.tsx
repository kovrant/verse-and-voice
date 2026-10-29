import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

// Teacher portal: NextAdmin pill (rounded-full, py-0.5, medium). kid: keeps the
// student badge — only on what student callers never override (see tailwind.config).
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 kid:rounded-lg kid:py-1 kid:font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary kid:bg-secondary/50",
        secondary: "border-transparent bg-secondary text-secondary-foreground kid:bg-secondary/40",
        destructive: "border-transparent bg-destructive/10 text-destructive kid:bg-destructive/15",
        outline: "text-foreground border-border",
        // Teacher emerald is the indigo accent, so success reads --success (green).
        success:
          "border-transparent bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] kid:bg-emerald-500/15 kid:text-emerald-600",
        warning: "border-transparent bg-amber-300/60 text-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
