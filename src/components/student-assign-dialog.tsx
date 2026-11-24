"use client"

import { BookMarked, Check, Loader2, ScrollText, Search, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Kind = "mem" | "hadith" | "quiz"

interface Choice {
  kind: Kind
  id: string
  title: string
  hint: string
  assigned: boolean
}

const SECTIONS: { kind: Kind; label: string; icon: typeof BookMarked }[] = [
  { kind: "mem", label: "Duas and surahs", icon: BookMarked },
  { kind: "hadith", label: "Hadiths", icon: ScrollText },
  { kind: "quiz", label: "Quizzes", icon: Sparkles },
]

const key = (c: { kind: Kind; id: string }) => `${c.kind}:${c.id}`

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "Request failed")
  }
}

/**
 * One place to give a student new work: tick duas/surahs, hadiths and quizzes
 * together, then assign them in one go. Uses the same writes as each section's
 * own Assign (catalog upsert, the hadith and quiz assign APIs, which notify).
 */
export function StudentAssignDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
  onAssigned,
}: {
  studentId: string
  studentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}) {
  const [choices, setChoices] = useState<Choice[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPicked(new Set())
    setSearch("")
    setChoices(null)
    void Promise.all([
      supabase.from("memorization_catalog").select("id, title, category").order("title"),
      supabase.from("student_memorization").select("catalog_id").eq("student_id", studentId),
      supabase
        .from("hadiths")
        .select("id, hadith_number, english_text, topic")
        .eq("is_published", true)
        .order("hadith_number"),
      supabase.from("hadith_assignments").select("hadith_id").eq("student_id", studentId),
      supabase
        .from("quizzes")
        .select("id, title")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("quiz_assignments")
        .select("quiz_id")
        .eq("student_id", studentId)
        .eq("status", "pending"),
    ]).then(([cat, mine, had, myHad, quiz, myQuiz]) => {
      const memIds = new Set((mine.data ?? []).map((r) => r.catalog_id))
      const hadIds = new Set((myHad.data ?? []).map((r) => r.hadith_id))
      const quizIds = new Set((myQuiz.data ?? []).map((r) => r.quiz_id))
      setChoices([
        ...(cat.data ?? []).map((c) => ({
          kind: "mem" as const,
          id: c.id,
          title: c.title,
          hint: c.category,
          assigned: memIds.has(c.id),
        })),
        ...(had.data ?? []).map((h) => ({
          kind: "hadith" as const,
          id: h.id,
          title: `#${h.hadith_number} · ${h.english_text}`,
          hint: h.topic,
          assigned: hadIds.has(h.id),
        })),
        ...(quiz.data ?? []).map((q) => ({
          kind: "quiz" as const,
          id: q.id,
          title: q.title,
          hint: "",
          assigned: quizIds.has(q.id),
        })),
      ])
    })
  }, [open, studentId])

  function toggle(c: Choice) {
    if (c.assigned) return
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(key(c))) next.delete(key(c))
      else next.add(key(c))
      return next
    })
  }

  async function assign() {
    const chosen = (choices ?? []).filter((c) => picked.has(key(c)))
    if (chosen.length === 0) return
    setSaving(true)
    try {
      const mem = chosen.filter((c) => c.kind === "mem")
      if (mem.length > 0) {
        const { error } = await supabase.from("student_memorization").upsert(
          mem.map((c) => ({ student_id: studentId, catalog_id: c.id, status: "memorizing" })),
          { onConflict: "student_id,catalog_id" },
        )
        if (error) throw error
      }
      // append / reassign only touch this student, never other students' assignments.
      await Promise.all(
        chosen.map((c) =>
          c.kind === "hadith"
            ? postJson("/api/hadiths/assign", {
                hadith_id: c.id,
                student_ids: [studentId],
                append: true,
              })
            : c.kind === "quiz"
              ? postJson("/api/quizzes/assign", {
                  quiz_id: c.id,
                  student_ids: [studentId],
                  reassign: true,
                })
              : null,
        ),
      )
      toast.success(
        `Gave ${studentName} ${chosen.length} new thing${chosen.length === 1 ? "" : "s"}`,
      )
      onOpenChange(false)
      onAssigned()
    } catch (e) {
      toast.error(`Couldn't assign everything: ${(e as Error).message}`)
      onAssigned()
    }
    setSaving(false)
  }

  const q = search.trim().toLowerCase()
  const visible = (choices ?? []).filter(
    (c) => !q || c.title.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="space-y-1 px-6 pb-4 pt-6">
          <DialogTitle>Assign to {studentName}</DialogTitle>
          <DialogDescription>
            Tick anything from the library. They get a notification for each hadith and quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search duas, hadiths, quizzes…"
              className="pl-10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-y border-border-primary px-6 py-4">
          {!choices ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-icon-tertiary" />
            </div>
          ) : (
            SECTIONS.map(({ kind, label, icon: Icon }) => {
              // New options first; what they already have sinks to the bottom.
              const rows = visible
                .filter((c) => c.kind === kind)
                .sort((a, b) => Number(a.assigned) - Number(b.assigned))
              if (rows.length === 0) return null
              const count = rows.filter((c) => picked.has(key(c))).length
              return (
                <section key={kind}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-tertiary">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {count > 0 && <span className="text-primary">· {count} picked</span>}
                  </p>
                  <div className="divide-y divide-border-primary rounded-lg border border-card-border">
                    {rows.map((c) => {
                      const on = picked.has(key(c))
                      return (
                        <button
                          key={key(c)}
                          type="button"
                          onClick={() => toggle(c)}
                          disabled={c.assigned}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                            c.assigned
                              ? "cursor-default opacity-60"
                              : on
                                ? "bg-primary/10"
                                : "hover:bg-background-gray-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 flex-shrink-0 items-center justify-center rounded border",
                              on || c.assigned
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-card-border",
                              c.assigned && "border-text-tertiary bg-text-tertiary",
                            )}
                          >
                            {(on || c.assigned) && <Check className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                            {c.title}
                          </span>
                          <span
                            className={cn(
                              "flex-shrink-0 text-xs text-text-tertiary",
                              !c.assigned && "capitalize",
                            )}
                          >
                            {c.assigned ? "Already assigned" : c.hint}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}
          {choices && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-text-tertiary">
              Nothing matches “{search}”
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm text-text-tertiary">
            {picked.size > 0 ? `${picked.size} picked` : "Nothing picked yet"}
          </p>
          <Button onClick={assign} disabled={saving || picked.size === 0} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Assigning…" : picked.size > 0 ? `Assign ${picked.size}` : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
