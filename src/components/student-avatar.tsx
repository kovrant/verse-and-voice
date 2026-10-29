"use client"

import Image from "next/image"
import { useState } from "react"

import { studentAvatarSrc } from "@/lib/student-avatar"
import { cn, type StudentGender } from "@/lib/utils"

const FALLBACK_TINT: Record<StudentGender | "none", string> = {
  boy: "bg-[rgba(59,130,246,0.10)] text-[#3B82F6]",
  girl: "bg-[rgba(236,72,153,0.10)] text-[#EC4899]",
  none: "bg-background-gray-secondary text-text-tertiary",
}

/**
 * Teacher-portal student portrait: the boy/girl avatar image filling its box,
 * or a tinted initial when boy/girl isn't set or the image isn't there yet.
 * Size it with the parent (it fills `relative` + explicit size).
 */
export function StudentAvatar({
  id,
  name,
  gender,
  sizes,
  className,
  initialClassName = "text-5xl",
}: {
  id: string
  name: string
  gender: StudentGender | null | undefined
  sizes: string
  className?: string
  initialClassName?: string
}) {
  const src = studentAvatarSrc(id, gender)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold",
          FALLBACK_TINT[gender ?? "none"],
          initialClassName,
          className,
        )}
      >
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      onError={() => setFailed(true)}
      className={cn("object-cover object-bottom", className)}
    />
  )
}
