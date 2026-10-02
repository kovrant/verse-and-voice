"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  HelpCircle,
  Layers,
  Sparkles,
  Volume2,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Markdown } from "@/components/markdown"
import { parseStoryScenes, type StoryScene } from "@/lib/history"

interface StorySceneReaderProps {
  content: string
  storyTitle?: string
  className?: string
  onFinishAdventure?: () => void
}

export function StorySceneReader({
  content,
  storyTitle = "Story",
  className = "",
  onFinishAdventure,
}: StorySceneReaderProps) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"card" | "full">("card")

  const scenes: StoryScene[] = useMemo(() => {
    return parseStoryScenes(content)
  }, [content])

  if (!scenes || scenes.length === 0) {
    return (
      <div className="rounded-[24px] border-[1.5px] border-border bg-card p-6 shadow-soft">
        <Markdown content={content} />
      </div>
    )
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0]
  const isFirstScene = activeSceneIndex === 0
  const isLastScene = activeSceneIndex === scenes.length - 1

  function handleNext() {
    if (!isLastScene) {
      setActiveSceneIndex((prev) => Math.min(scenes.length - 1, prev + 1))
    } else {
      if (onFinishAdventure) {
        onFinishAdventure()
      } else {
        const gemElement = document.getElementById("quran-gem-section")
        if (gemElement) {
          gemElement.scrollIntoView({ behavior: "smooth" })
        }
      }
    }
  }

  function handlePrev() {
    setActiveSceneIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Bar: Scene Segmented Progress & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Scene Progress Track */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {scenes.map((scene, idx) => {
            const isActive = idx === activeSceneIndex
            const isCompleted = idx < activeSceneIndex
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => setActiveSceneIndex(idx)}
                className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                  isActive
                    ? "border-[hsl(var(--kid-teal))] bg-[hsl(var(--kid-teal)/0.18)] text-[hsl(var(--kid-teal))] shadow-xs scale-105"
                    : isCompleted
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-[hsl(var(--kid-teal))] text-white"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                </span>
                <span className="hidden sm:inline">Scene {idx + 1}</span>
              </button>
            )
          })}
        </div>

        {/* View Mode Toggle: Interactive Card vs Full Continuous Read */}
        <div className="inline-flex items-center rounded-full border border-border/80 bg-secondary/40 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-all ${
              viewMode === "card"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("full")}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-all ${
              viewMode === "full"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3 w-3" />
            <span>Full Book</span>
          </button>
        </div>
      </div>

      {/* Mode A: Interactive Flip-Card View (Default) */}
      {viewMode === "card" ? (
        <div className="relative overflow-hidden rounded-[26px] border-[2px] border-[hsl(var(--kid-teal)/0.45)] bg-card p-5 sm:p-7 shadow-soft">
          {/* Decorative Background Blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[hsl(var(--kid-teal)/0.12)] blur-3xl"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="space-y-4"
            >
              {/* Scene Header */}
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-[hsl(var(--kid-teal))]">
                  <span>🎬 SCENE {currentScene.sceneNumber} OF {scenes.length}</span>
                  {storyTitle && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="truncate text-muted-foreground text-[11px] font-semibold">
                        {storyTitle}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 font-heading text-[20px] sm:text-[23px] font-bold leading-snug text-primary">
                  {currentScene.title}
                </h2>
              </div>

              {/* Scene Content Paragraphs with Graphic Novel Beats */}
              <div className="space-y-3.5 pt-1">
                {currentScene.paragraphs.map((p, pIdx) => {
                  const isDialogue =
                    p.includes('"') ||
                    p.includes("“") ||
                    p.startsWith("💬") ||
                    p.startsWith("🤲") ||
                    p.startsWith("😈") ||
                    /^(?:Allah|Adam|Hawa|Iblis|Satan|Nuh|Musa|Ibrahim|The angels|He|She)\s*(?:said|whispered|sneered|pleaded|commanded|replied):/i.test(
                      p,
                    )

                  const isDilemma =
                    p.includes("PAUSE & REFLECT") ||
                    p.includes("PAUSE & THINK") ||
                    p.startsWith("⚡")

                  const isSoundEffect =
                    /^(?:💥|🌬️|⚡|🤫|🔥|✨|BOOM|ACHOO|WHOOSH|CRACKLE)/i.test(p) ||
                    (p.length < 60 && /(?:ACHOO|Alhamdulillah|Yarhamuk-Allah)/i.test(p))

                  // 1. Dilemma / Pause Beat
                  if (isDilemma) {
                    return (
                      <div
                        key={pIdx}
                        className="my-3 flex items-start gap-3 rounded-2xl border-[1.5px] border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 p-4 text-foreground shadow-xs"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                          <HelpCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Pause &amp; Think
                          </span>
                          <p className="mt-0.5 text-[15px] sm:text-[16px] font-bold leading-relaxed text-foreground">
                            {p.replace(/^⚡\s*\*{0,2}(?:PAUSE & (?:REFLECT|THINK):?)\*{0,2}/i, "").trim()}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  // 2. Sound Effect Beat
                  if (isSoundEffect && p.length < 120) {
                    return (
                      <div
                        key={pIdx}
                        className="my-2.5 inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--kid-saffron)/0.5)] bg-[hsl(var(--kid-saffron)/0.18)] px-4 py-2 text-foreground font-black text-[15px] sm:text-[16px] shadow-xs"
                      >
                        <Volume2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    )
                  }

                  // 3. Speech / Dialogue Balloon Card
                  if (isDialogue && p.length < 400) {
                    const isAntagonist = /Iblis|Satan|sneered|jealous|fire/i.test(p)
                    const isDua = /Our Lord|pleaded|prayed|forgive us|mercy/i.test(p)

                    return (
                      <div
                        key={pIdx}
                        className={`my-3 rounded-2xl border-[1.5px] p-3.5 sm:p-4 text-[15px] sm:text-[16px] font-medium leading-relaxed transition-all shadow-xs ${
                          isAntagonist
                            ? "border-purple-500/40 bg-purple-500/10 text-foreground"
                            : isDua
                              ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                              : "border-[hsl(var(--kid-teal)/0.4)] bg-[hsl(var(--kid-teal)/0.12)] text-foreground"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl shrink-0" aria-hidden>
                            {isAntagonist ? "😈" : isDua ? "🤲" : "💬"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="italic">{p}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // 4. Standard Kid Narrative Paragraph
                  return (
                    <p
                      key={pIdx}
                      className="text-[16px] sm:text-[17.5px] font-normal leading-[1.8] text-foreground/90"
                    >
                      {p}
                    </p>
                  )
                })}
              </div>

              {/* Bottom Card Navigation Bar */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isFirstScene}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13.5px] font-bold transition-all ${
                    isFirstScene
                      ? "opacity-30 cursor-not-allowed border-transparent text-muted-foreground"
                      : "border-border/80 bg-card text-foreground hover:bg-secondary/40 active:scale-95 shadow-soft"
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <span className="text-[12px] font-bold text-muted-foreground">
                  Page {activeSceneIndex + 1} of {scenes.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-black text-white shadow-soft transition-all hover:-translate-y-0.5 active:scale-95 ${
                    isLastScene
                      ? "bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700"
                      : "bg-[hsl(var(--kid-teal))] hover:bg-[hsl(var(--kid-teal)/0.9)]"
                  }`}
                >
                  {isLastScene ? (
                    <>
                      <span>Unlock Quran Gem</span>
                      <Sparkles className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Page</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        /* Mode B: Full Storybook Scroll View */
        <div className="space-y-6">
          {scenes.map((sc) => (
            <div
              key={sc.id}
              className="rounded-[24px] border-[1.5px] border-border bg-card p-5 sm:p-7 shadow-soft space-y-3"
            >
              <div className="border-b border-border/60 pb-2.5">
                <span className="text-[11.5px] font-black uppercase tracking-wider text-[hsl(var(--kid-teal))]">
                  Scene {sc.sceneNumber}
                </span>
                <h3 className="font-heading text-[19px] sm:text-[21px] font-bold text-primary">
                  {sc.title}
                </h3>
              </div>
              <div className="space-y-3 text-[16px] sm:text-[17.5px] leading-[1.8] text-foreground/90">
                {sc.paragraphs.map((para, pidx) => (
                  <p key={pidx}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
