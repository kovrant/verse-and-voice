import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_1px_2px_rgba(0,0,0,0.3),0_0_12px_rgba(16,185,129,0.1)] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_1px_2px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.2)] hover:from-emerald-400 hover:to-emerald-500",
        destructive:
          "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-md",
        outline:
          "border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-white/[0.04] hover:text-foreground",
        link:
          "text-emerald-400 underline-offset-4 hover:underline",
        gold:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[0_0_0_1px_rgba(217,168,67,0.3),0_1px_2px_rgba(0,0,0,0.3),0_0_12px_rgba(217,168,67,0.1)] hover:shadow-[0_0_0_1px_rgba(217,168,67,0.4),0_1px_2px_rgba(0,0,0,0.3),0_0_20px_rgba(217,168,67,0.2)] hover:from-amber-400 hover:to-amber-500",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
