"use client"

import { Check, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { useStudent } from "@/lib/use-student"

interface StoryReflectionPledgeProps {
  storyId: string
  storyTitle?: string
  challenge?: string | null
  quizId?: string | null
  className?: string
}

/* 24 confetti pieces on fixed tracks */
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 4.3 + (i % 3) * 8) % 96}%`,
  delay: `${(i % 5) * 120}ms`,
  fall: `${2400 + (i % 4) * 350}ms`,
  spin: `${((i % 4) + 1) * 360}deg`,
  color: ["#E3B04B", "#8FA97A", "#D98363", "#7FA3B8", "#9D8BB5", "#6FA3A0"][i % 6],
}))

export function StoryReflectionPledge({
  storyId,
  challenge,
  quizId,
  className = "",
}: StoryReflectionPledgeProps) {
  const { student } = useStudent()
  const [completed, setCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check if student has already completed this story
  useEffect(() => {
    if (!student?.id || !storyId) return
    const key = `story_completed_${student.id}_${storyId}`
    if (localStorage.getItem(key)) {
      setCompleted(true)
    }
  }, [student?.id, storyId])

  async function handleComplete() {
    if (completed || saving) return
    setSaving(true)
    setShowConfetti(true)
    setCompleted(true)

    if (student?.id) {
      localStorage.setItem(`story_completed_${student.id}_${storyId}`, "true")
      try {
        await fetch("/api/history/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: student.id,
            story_id: storyId,
            reflection_pledged: true,
          }),
        })
      } catch (err) {
        console.warn("Failed to record story completion progress:", err)
      }
    }

    setTimeout(() => {
      setShowConfetti(false)
    }, 4000)
    setSaving(false)
  }

  return (
    <div
      className={`relative my-8 overflow-hidden rounded-[26px] border-[2px] border-[hsl(var(--kid-teal)/0.6)] p-5 sm:p-7 shadow-soft ${className}`}
      style={{
        background:
          "linear-gradient(150deg, hsl(var(--kid-teal)/0.18) 0%, hsl(var(--card)) 100%)",
      }}
    >
      {/* Confetti Overlay */}
      {showConfetti && (
        <span aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="confetti-piece absolute top-0 block h-2.5 w-2 rounded-[2px]"
              style={
                {
                  left: c.left,
                  background: c.color,
                  "--delay": c.delay,
                  "--fall": c.fall,
                  "--spin": c.spin,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--kid-saffron)/0.35)] text-2xl">
          🎯
        </span>
        <div>
          <h3 className="font-heading text-[18px] sm:text-[21px] font-bold text-foreground">
            The Explorer Challenge
          </h3>
          <p className="text-[12.5px] font-semibold text-muted-foreground">
            Make a pledge in your heart to put this wisdom into action!
          </p>
        </div>
      </div>

      {/* Challenge Box */}
      {challenge && (
        <div className="mt-4 rounded-2xl border-[1.5px] border-[hsl(var(--kid-teal)/0.4)] bg-card/85 p-4 sm:p-5 shadow-sm">
          <span className="block text-[12px] font-black uppercase tracking-wider text-[hsl(var(--kid-teal))]">
            Your Action Pledge
          </span>
          <p className="mt-1 text-[15px] sm:text-[16px] font-semibold leading-relaxed text-foreground">
            “{challenge}”
          </p>
        </div>
      )}

      {/* Action / Completion Button */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {completed ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            MashaAllah! You finished this story! ✨
          </div>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--kid-teal))] px-6 py-2.5 text-[15px] font-extrabold text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-hover active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 text-amber-200 transition-transform group-hover:rotate-12" />
            I Completed This Story! 🎉
          </button>
        )}

        {/* Quest Link */}
        {quizId && (
          <Link
            href={`/student/quizzes/${quizId}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-[14.5px] font-black text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-hover active:scale-[0.98]"
          >
            <Trophy className="h-4 w-4 text-amber-100" />
            Take Story Quest 🏆 →
          </Link>
        )}
      </div>
    </div>
  )
}
