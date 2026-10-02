"use client"

import type { LifeLesson } from "@/lib/history"

interface StoryMoralCompassProps {
  lessons: LifeLesson[]
  virtue?: string | null
  className?: string
}

export function StoryMoralCompass({
  lessons,
  virtue,
  className = "",
}: StoryMoralCompassProps) {
  if (!lessons || lessons.length === 0) return null

  // Card themes for the 3 kid contexts
  const contextStyles = [
    {
      border: "border-[hsl(var(--kid-sky)/0.5)]",
      bg: "bg-[hsl(var(--kid-sky)/0.12)]",
      accent: "text-sky-600 dark:text-sky-400",
      fallbackEmoji: "🏫",
    },
    {
      border: "border-[hsl(var(--kid-sage)/0.5)]",
      bg: "bg-[hsl(var(--kid-sage)/0.12)]",
      accent: "text-emerald-600 dark:text-emerald-400",
      fallbackEmoji: "🏡",
    },
    {
      border: "border-[hsl(var(--kid-coral)/0.5)]",
      bg: "bg-[hsl(var(--kid-coral)/0.12)]",
      accent: "text-rose-600 dark:text-rose-400",
      fallbackEmoji: "💖",
    },
  ]

  return (
    <section className={`my-8 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--kid-teal)/0.25)] text-xl">
            🧭
          </span>
          <div>
            <h3 className="font-heading text-[18px] sm:text-[20px] font-bold text-foreground">
              The Moral Compass
            </h3>
            <p className="text-[12.5px] font-semibold text-muted-foreground">
              How to live this story every single day
            </p>
          </div>
        </div>

        {virtue && (
          <span className="rounded-full bg-[hsl(var(--kid-teal)/0.25)] px-3 py-1 text-[12px] font-extrabold text-foreground">
            Virtue: {virtue}
          </span>
        )}
      </div>

      {/* 3 Practical Lesson Cards */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {lessons.map((lesson, idx) => {
          const style = contextStyles[idx % contextStyles.length]
          return (
            <div
              key={idx}
              className={`flex flex-col rounded-[22px] border-[1.5px] ${style.border} ${style.bg} p-4 shadow-soft transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center gap-2 pb-2">
                <span className="text-xl" aria-hidden>
                  {lesson.emoji || style.fallbackEmoji}
                </span>
                <span className={`text-[13px] font-black uppercase tracking-wider ${style.accent}`}>
                  {lesson.context}
                </span>
              </div>
              <p className="mt-1 flex-1 text-[14px] font-semibold leading-relaxed text-foreground/90">
                {lesson.lesson}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
