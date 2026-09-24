import type { ReactNode } from "react"

import type { KidColor } from "@/components/student-nav"
import { toast } from "@/lib/toast"

/**
 * Student-portal toast: storybook card in one of the crayon colours,
 * with a big emoji instead of the default status icon. Teacher toasts keep the
 * library's own look — only the student side calls this.
 */
export function kidToast(
  title: string,
  {
    emoji,
    color = "saffron",
    description,
    duration = 5000,
  }: {
    emoji: string
    color?: KidColor
    description?: ReactNode
    duration?: number
  },
) {
  toast(title, {
    description,
    duration,
    icon: emoji,
    preset: "bouncy",
    fillColor: `hsl(var(--kid-${color}) / 0.28)`,
    borderColor: `hsl(var(--kid-${color}) / 0.55)`,
    borderWidth: 1.5,
    classNames: {
      wrapper: "rounded-[24px] shadow-soft-lg",
      title: "font-heading text-[17px] font-bold text-primary",
      description: "text-[14px] font-semibold text-foreground/85",
      icon: "text-[24px]",
    },
  })
}
