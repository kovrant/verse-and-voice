"use client"

import {
  type Active,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import * as Popover from "@radix-ui/react-popover"
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Check,
  ChevronDown,
  Eye,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import { createContext, type ReactNode, useContext, useMemo, useState } from "react"

import { PanelHeader } from "@/components/panel-header"
import { StudentAvatar } from "@/components/student-avatar"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getHadithNextMilestone, HADITH_TOPICS } from "@/lib/hadiths/hadith-engine"
import type { Hadith, HadithAssignment, StudentHadithProgress } from "@/lib/hadiths/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn, COUNTRY_FLAGS, safeFormatDate, type Student } from "@/lib/utils"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** What is being dragged: a library hadith, or a student's current assignment. */
type DragItem =
  | { kind: "library"; hadith: Hadith }
  | { kind: "assignment"; hadith: Hadith; assignment: HadithAssignment }

/** Where it can land. */
type DropTarget =
  | { kind: "learning"; studentId: string }
  | { kind: "memorized"; studentId: string }
  | { kind: "library" }
  | { kind: "everyone" }

/**
 * Drag-and-drop hadith assigning (after NextAdmin's task list): the library on
 * the left, one group per student on the right. Drop a hadith on a student to
 * assign it, on their Memorized row to mark it, back on the library to remove.
 */
export function HadithBoard({
  hadiths,
  students,
  assignments,
  progressList,
  onChanged,
  onAssignTo,
}: {
  hadiths: Hadith[]
  students: Student[]
  assignments: HadithAssignment[]
  progressList: StudentHadithProgress[]
  /** Reload assignments + progress after a change. */
  onChanged: () => Promise<void>
  /** Open the student-picker dialog for one hadith (the phone fallback). */
  onAssignTo: (hadith: Hadith) => void
}) {
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("all")
  const [onlyNeeds, setOnlyNeeds] = useState(false)
  const [dragging, setDragging] = useState<DragItem | null>(null)
  const [viewing, setViewing] = useState<Hadith | null>(null)
  // Optimistic rows, shown until the reload brings back the real ones
  const [pending, setPending] = useState<HadithAssignment[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const hadithById = useMemo(() => new Map(hadiths.map((h) => [h.id, h])), [hadiths])
  const learning = useMemo(
    () => [...pending, ...assignments].filter((a) => a.status === "pending" && !removed.has(a.id)),
    [assignments, pending, removed],
  )
  const memorizedKey = useMemo(
    () =>
      new Set(
        progressList
          .filter((p) => p.status === "memorized")
          .map((p) => `${p.student_id}:${p.hadith_id}`),
      ),
    [progressList],
  )
  const learningKey = useMemo(
    () => new Set(learning.map((a) => `${a.student_id}:${a.hadith_id}`)),
    [learning],
  )

  const filteredHadiths = hadiths.filter((h) => {
    if (topic !== "all" && h.topic !== topic) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(h.hadith_number) === q ||
      h.english_text.toLowerCase().includes(q) ||
      h.kids_lesson.toLowerCase().includes(q) ||
      h.reference.toLowerCase().includes(q)
    )
  })

  const lanes = students
    .map((s) => ({
      student: s,
      learning: learning.filter((a) => a.student_id === s.id),
      memorized: progressList.filter((p) => p.student_id === s.id && p.status === "memorized"),
    }))
    .filter((l) => !onlyNeeds || l.learning.length === 0)
  const needsCount = students.filter((s) => !learning.some((a) => a.student_id === s.id)).length

  /** Why a drop isn't allowed, or null when it is. */
  function refusal(item: DragItem, target: DropTarget): string | null {
    const h = item.hadith
    if (target.kind === "library") {
      return item.kind === "assignment" ? null : "Already in the library"
    }
    if (target.kind === "everyone") {
      return item.kind === "library" ? null : "Drag from the library to assign everyone"
    }
    const key = `${target.studentId}:${h.id}`
    if (memorizedKey.has(key)) return "Already memorized"
    if (target.kind === "learning") {
      if (item.kind === "assignment") return "Drag from the library to assign"
      if (learningKey.has(key)) return "Already learning this"
      return null
    }
    // memorized
    if (item.kind === "assignment" && item.assignment.student_id !== target.studentId) {
      return "Belongs to another student"
    }
    return null
  }

  async function assign(hadith: Hadith, studentIds: string[]) {
    const ids = studentIds.filter(
      (id) => !memorizedKey.has(`${id}:${hadith.id}`) && !learningKey.has(`${id}:${hadith.id}`),
    )
    if (ids.length === 0) {
      toast.info("Everyone already has this hadith")
      return
    }
    const due = new Date(Date.now() + WEEK_MS).toISOString()
    const temp = ids.map((id) => ({
      id: `tmp-${id}-${hadith.id}`,
      hadith_id: hadith.id,
      student_id: id,
      status: "pending" as const,
      due_date: due,
      assigned_at: new Date().toISOString(),
    }))
    setPending((p) => [...p, ...temp])
    try {
      const res = await fetch("/api/hadiths/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hadith_id: hadith.id,
          student_ids: ids,
          due_date: due,
          append: true,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed")
      await onChanged()
      const who =
        ids.length === 1
          ? (students.find((s) => s.id === ids[0])?.name ?? "1 student")
          : `${ids.length} students`
      toast.success(`Hadith #${hadith.hadith_number} assigned to ${who}`, {
        action: { label: "Undo", onClick: () => void unassign(hadith.id, ids) },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't assign the hadith")
    } finally {
      setPending((p) => p.filter((a) => !temp.some((t) => t.id === a.id)))
    }
  }

  async function unassign(hadithId: string, studentIds: string[]) {
    const { error } = await supabase
      .from("hadith_assignments")
      .delete()
      .eq("hadith_id", hadithId)
      .eq("status", "pending")
      .in("student_id", studentIds)
    if (error) toast.error("Couldn't undo")
    await onChanged()
  }

  async function remove(a: HadithAssignment) {
    setRemoved((r) => new Set(r).add(a.id))
    const { error } = await supabase.from("hadith_assignments").delete().eq("id", a.id)
    if (error) toast.error("Couldn't remove the assignment")
    else toast.success(`Removed Hadith #${hadithById.get(a.hadith_id)?.hadith_number ?? ""}`)
    await onChanged()
    setRemoved((r) => {
      const next = new Set(r)
      next.delete(a.id)
      return next
    })
  }

  async function memorize(studentId: string, hadith: Hadith) {
    const name = students.find((s) => s.id === studentId)?.name ?? "the student"
    try {
      const res = await fetch("/api/hadiths/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, hadith_id: hadith.id, status: "memorized" }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      await onChanged()
      const badges: string[] = data.newlyAwardedBadges ?? []
      toast.success(
        `Masha'Allah! ${name} memorized Hadith #${hadith.hadith_number}`,
        badges.length ? { description: `New badge: ${badges.join(", ")}` } : undefined,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't mark as memorized")
    }
  }

  async function setDue(a: HadithAssignment, date: string) {
    const { error } = await supabase
      .from("hadith_assignments")
      .update({ due_date: date ? new Date(`${date}T12:00:00`).toISOString() : null })
      .eq("id", a.id)
    if (error) toast.error("Couldn't change the due date")
    await onChanged()
  }

  function onDragStart(e: DragStartEvent) {
    setDragging((e.active.data.current as DragItem) ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const item = e.active.data.current as DragItem | undefined
    const target = e.over?.data.current as DropTarget | undefined
    if (!item || !target) return
    const why = refusal(item, target)
    if (why) {
      // Dropping where it started isn't worth a message
      if (!(item.kind === "library" && target.kind === "library")) toast.warning(why)
      return
    }
    if (target.kind === "learning") void assign(item.hadith, [target.studentId])
    else if (target.kind === "everyone")
      void assign(
        item.hadith,
        students.map((s) => s.id),
      )
    else if (target.kind === "memorized") void memorize(target.studentId, item.hadith)
    else if (target.kind === "library" && item.kind === "assignment") void remove(item.assignment)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <BoardCheck refusal={refusal}>
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Library */}
          <LibraryColumn>
            <div className="space-y-3 border-b border-border-primary p-4">
              <PanelHeader
                icon={BookOpen}
                tint="indigo"
                title="Hadith library"
                summary={`${hadiths.length} hadiths · drag one onto a student`}
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-tertiary" />
                <Input
                  placeholder="Search or type a number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                <TopicChip active={topic === "all"} onClick={() => setTopic("all")}>
                  All
                </TopicChip>
                {Object.values(HADITH_TOPICS).map((t) => (
                  <TopicChip key={t.key} active={topic === t.key} onClick={() => setTopic(t.key)}>
                    {t.icon} {t.label}
                  </TopicChip>
                ))}
              </div>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3 lg:max-h-[calc(100vh-330px)]">
              {filteredHadiths.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-tertiary">No hadiths match.</p>
              ) : (
                filteredHadiths.map((h) => (
                  <LibraryCard
                    key={h.id}
                    hadith={h}
                    learningCount={learning.filter((a) => a.hadith_id === h.id).length}
                    onView={() => setViewing(h)}
                    onAssignTo={() => onAssignTo(h)}
                  />
                ))
              )}
            </div>
          </LibraryColumn>

          {/* Students */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <EveryoneDrop />
              <div className="inline-flex items-center gap-1 rounded-lg bg-background-gray-secondary p-1">
                <FilterButton active={!onlyNeeds} onClick={() => setOnlyNeeds(false)}>
                  All students ({students.length})
                </FilterButton>
                <FilterButton active={onlyNeeds} onClick={() => setOnlyNeeds(true)}>
                  Needs a hadith ({needsCount})
                </FilterButton>
              </div>
            </div>

            {lanes.length === 0 ? (
              <Card className="p-10 text-center text-sm text-text-tertiary">
                Every student has a hadith to learn.
              </Card>
            ) : (
              lanes.map((l) => (
                <StudentLane
                  key={l.student.id}
                  student={l.student}
                  learning={l.learning}
                  memorized={l.memorized}
                  hadithById={hadithById}
                  onView={setViewing}
                  onMemorize={(h) => void memorize(l.student.id, h)}
                  onRemove={(a) => void remove(a)}
                  onDue={(a, d) => void setDue(a, d)}
                />
              ))
            )}
          </div>
        </div>
      </BoardCheck>

      <DragOverlay dropAnimation={null}>
        {dragging && <DragCard hadith={dragging.hadith} />}
      </DragOverlay>

      <HadithDetail
        hadith={viewing}
        students={students}
        learning={learning}
        progressList={progressList}
        onClose={() => setViewing(null)}
        onAssignTo={(h) => {
          setViewing(null)
          onAssignTo(h)
        }}
      />
    </DndContext>
  )
}

/* ── Drop-validity context: lanes read it to colour themselves while dragging ── */

type RefusalFn = (item: DragItem, target: DropTarget) => string | null
const RefusalContext = createContext<RefusalFn>(() => null)

function BoardCheck({ refusal, children }: { refusal: RefusalFn; children: ReactNode }) {
  return <RefusalContext.Provider value={refusal}>{children}</RefusalContext.Provider>
}

/** Drop-zone tone for the current drag: idle, ok, refused, or hovered. */
function useDropTone(target: DropTarget, isOver: boolean) {
  const { active } = useDndContext()
  const refusal = useContext(RefusalContext)
  const item = (active as Active | null)?.data.current as DragItem | undefined
  if (!item) return { tone: "idle" as const, why: null }
  const why = refusal(item, target)
  if (why) return { tone: isOver ? ("refused" as const) : ("idle" as const), why }
  return { tone: isOver ? ("hover" as const) : ("ok" as const), why: null }
}

const TONE: Record<"idle" | "ok" | "hover" | "refused", string> = {
  idle: "border-transparent",
  ok: "border-dashed border-primary/40 bg-primary/[0.03]",
  hover: "border-primary bg-primary/[0.07] ring-4 ring-primary/10",
  refused: "border-destructive/50 bg-destructive/5",
}

/* ── Library ── */

function LibraryColumn({ children }: { children: ReactNode }) {
  const target: DropTarget = { kind: "library" }
  const { setNodeRef, isOver } = useDroppable({ id: "library", data: target })
  const { tone } = useDropTone(target, isOver)
  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "overflow-hidden border-2 transition-colors lg:sticky lg:top-[88px]",
        tone === "idle" ? "border-card-border" : TONE[tone],
      )}
    >
      {children}
      {(tone === "ok" || tone === "hover") && (
        <p className="flex items-center justify-center gap-1.5 border-t border-border-primary py-2 text-xs font-medium text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Drop here to remove the assignment
        </p>
      )}
    </Card>
  )
}

function TopicChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background-gray-secondary text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  )
}

function LibraryCard({
  hadith,
  learningCount,
  onView,
  onAssignTo,
}: {
  hadith: Hadith
  learningCount: number
  onView: () => void
  onAssignTo: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib:${hadith.id}`,
    data: { kind: "library", hadith } satisfies DragItem,
  })
  const topic = HADITH_TOPICS[hadith.topic] ?? HADITH_TOPICS.general
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-start gap-2 rounded-xl border border-card-border bg-card-background p-2.5 transition-shadow hover:shadow-xs",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag Hadith ${hadith.hadith_number}`}
        className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-icon-tertiary hover:bg-background-gray-secondary hover:text-icon-secondary active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-primary">
            #{hadith.hadith_number}
          </span>
          <span className="truncate text-[11px] text-text-tertiary">
            {topic.icon} {topic.label}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-sm text-text-primary">{hadith.english_text}</span>
        {learningCount > 0 && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-text-tertiary">
            <Users className="h-3 w-3" /> {learningCount} learning
          </span>
        )}
      </button>
      <CardMenu>
        <MenuItem icon={Eye} onClick={onView}>
          View hadith
        </MenuItem>
        <MenuItem icon={Send} onClick={onAssignTo}>
          Assign to…
        </MenuItem>
      </CardMenu>
    </div>
  )
}

function DragCard({ hadith }: { hadith: Hadith }) {
  return (
    <div className="flex w-[300px] cursor-grabbing items-start gap-2 rounded-xl border border-primary/40 bg-card-background p-2.5 shadow-3xl rotate-[-2deg]">
      <GripVertical className="mt-0.5 h-4 w-4 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-primary">#{hadith.hadith_number}</p>
        <p className="line-clamp-2 text-sm text-text-primary">{hadith.english_text}</p>
      </div>
    </div>
  )
}

/* ── Students ── */

function EveryoneDrop() {
  const target: DropTarget = { kind: "everyone" }
  const { setNodeRef, isOver } = useDroppable({ id: "everyone", data: target })
  const { tone } = useDropTone(target, isOver)
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm transition-colors",
        tone === "idle" ? "border-dashed border-border-primary text-text-tertiary" : TONE[tone],
        (tone === "ok" || tone === "hover") && "text-primary",
      )}
    >
      <Users className="h-4 w-4 flex-shrink-0" />
      Drop here to assign to every student
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-card-background text-text-primary shadow-xs"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  )
}

function StudentLane({
  student,
  learning,
  memorized,
  hadithById,
  onView,
  onMemorize,
  onRemove,
  onDue,
}: {
  student: Student
  learning: HadithAssignment[]
  memorized: StudentHadithProgress[]
  hadithById: Map<string, Hadith>
  onView: (h: Hadith) => void
  onMemorize: (h: Hadith) => void
  onRemove: (a: HadithAssignment) => void
  onDue: (a: HadithAssignment, date: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [showMemorized, setShowMemorized] = useState(false)
  const learnTarget: DropTarget = { kind: "learning", studentId: student.id }
  const memTarget: DropTarget = { kind: "memorized", studentId: student.id }
  const learnDrop = useDroppable({ id: `learn:${student.id}`, data: learnTarget })
  const memDrop = useDroppable({ id: `mem:${student.id}`, data: memTarget })
  const learnTone = useDropTone(learnTarget, learnDrop.isOver)
  const memTone = useDropTone(memTarget, memDrop.isOver)
  const milestone = getHadithNextMilestone(memorized.length)
  const needs = learning.length === 0

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background-gray-primary"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-icon-tertiary transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="relative size-9 flex-shrink-0 overflow-hidden rounded-full">
          <StudentAvatar
            id={student.id}
            name={student.name}
            gender={student.gender}
            sizes="36px"
            className="object-[50%_20%]"
            initialClassName="text-sm"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-text-primary">{student.name}</span>
            {student.country && COUNTRY_FLAGS[student.country] && (
              <span role="img" aria-label={student.country} className="text-sm leading-none">
                {COUNTRY_FLAGS[student.country]}
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-text-tertiary">
            {learning.length} learning · {memorized.length} memorized
            {!milestone.isComplete && ` · next badge at ${milestone.target}`}
          </span>
        </span>
        {needs && (
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Needs a hadith
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-border-primary p-3">
          <div
            ref={learnDrop.setNodeRef}
            className={cn(
              "space-y-2 rounded-xl border-2 p-1 transition-colors",
              TONE[learnTone.tone],
            )}
          >
            {learning.map((a) => {
              const h = hadithById.get(a.hadith_id)
              if (!h) return null
              return (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  hadith={h}
                  onView={() => onView(h)}
                  onMemorize={() => onMemorize(h)}
                  onRemove={() => onRemove(a)}
                  onDue={(d) => onDue(a, d)}
                />
              )
            })}
            <p
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium",
                learnTone.tone === "refused"
                  ? "text-destructive"
                  : learnTone.tone === "hover"
                    ? "text-primary"
                    : "text-text-tertiary",
              )}
            >
              {learnTone.tone === "refused" ? (
                learnTone.why
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Drop a hadith here
                </>
              )}
            </p>
          </div>

          <div
            ref={memDrop.setNodeRef}
            className={cn(
              "rounded-xl border-2 transition-colors",
              memTone.tone === "idle"
                ? "border-transparent bg-background-gray-primary"
                : TONE[memTone.tone],
            )}
          >
            <button
              type="button"
              onClick={() => setShowMemorized((s) => !s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
              </span>
              <span className="font-medium text-text-primary">Memorized</span>
              <span className="text-text-tertiary">({memorized.length})</span>
              <span className="ml-auto text-xs text-text-tertiary">
                {memTone.tone === "refused"
                  ? memTone.why
                  : memTone.tone === "ok" || memTone.tone === "hover"
                    ? "Drop to mark memorized"
                    : memorized.length > 0 && (showMemorized ? "Hide" : "Show")}
              </span>
            </button>
            {showMemorized && memorized.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                {memorized.map((p) => {
                  const h = hadithById.get(p.hadith_id)
                  if (!h) return null
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onView(h)}
                      title={h.english_text}
                      className="rounded-full bg-card-background px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-primary transition-colors hover:text-primary"
                    >
                      #{h.hadith_number}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function AssignmentCard({
  assignment,
  hadith,
  onView,
  onMemorize,
  onRemove,
  onDue,
}: {
  assignment: HadithAssignment
  hadith: Hadith
  onView: () => void
  onMemorize: () => void
  onRemove: () => void
  onDue: (date: string) => void
}) {
  const temp = assignment.id.startsWith("tmp-")
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asg:${assignment.id}`,
    data: { kind: "assignment", hadith, assignment } satisfies DragItem,
    disabled: temp,
  })
  const due = assignment.due_date ? new Date(assignment.due_date) : null
  const overdue = due ? due.getTime() < Date.now() : false

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-card-border bg-card-background px-2.5 py-2 shadow-xs",
        isDragging && "opacity-40",
        temp && "animate-pulse",
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag Hadith ${hadith.hadith_number}`}
        className="cursor-grab touch-none rounded p-0.5 text-icon-tertiary hover:bg-background-gray-secondary hover:text-icon-secondary active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-primary">
          #{hadith.hadith_number}
        </span>
        <span className="truncate text-sm text-text-primary">{hadith.english_text}</span>
      </button>
      {due && (
        <span
          className={cn(
            "hidden flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
            overdue
              ? "bg-destructive/10 text-destructive"
              : "bg-background-gray-secondary text-text-secondary",
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {overdue ? "Overdue" : `Due ${safeFormatDate(due, "EEE d MMM")}`}
        </span>
      )}
      {!temp && (
        <CardMenu>
          <MenuItem icon={Check} onClick={onMemorize}>
            Mark memorized
          </MenuItem>
          <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary">
            <CalendarClock className="h-4 w-4 text-icon-secondary" />
            <span className="flex-1">Due</span>
            <input
              type="date"
              defaultValue={due ? safeFormatDate(due, "yyyy-MM-dd") : ""}
              onChange={(e) => onDue(e.target.value)}
              className="rounded border border-border-primary bg-card-background px-1.5 py-0.5 text-xs text-text-primary"
            />
          </label>
          <MenuItem icon={Eye} onClick={onView}>
            View hadith
          </MenuItem>
          <MenuItem icon={Trash2} onClick={onRemove} danger>
            Remove
          </MenuItem>
        </CardMenu>
      )}
    </div>
  )
}

/* ── Menus & detail ── */

function CardMenu({ children }: { children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="More actions"
          className="flex-shrink-0 rounded-md p-1 text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-icon-secondary"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-lg border border-card-border bg-dropdowns-background p-1 shadow-3xl"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function MenuItem({
  icon: Icon,
  onClick,
  danger,
  children,
}: {
  icon: typeof Eye
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <Popover.Close asChild>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-background-gray-primary",
          danger ? "text-destructive" : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Icon className={cn("h-4 w-4", danger ? "text-destructive" : "text-icon-secondary")} />
        {children}
      </button>
    </Popover.Close>
  )
}

function HadithDetail({
  hadith,
  students,
  learning,
  progressList,
  onClose,
  onAssignTo,
}: {
  hadith: Hadith | null
  students: Student[]
  learning: HadithAssignment[]
  progressList: StudentHadithProgress[]
  onClose: () => void
  onAssignTo: (h: Hadith) => void
}) {
  if (!hadith) return null
  const topic = HADITH_TOPICS[hadith.topic] ?? HADITH_TOPICS.general
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name
  const learners = learning
    .filter((a) => a.hadith_id === hadith.id)
    .map((a) => nameOf(a.student_id))
    .filter(Boolean)
  const memorizers = progressList
    .filter((p) => p.hadith_id === hadith.id && p.status === "memorized")
    .map((p) => nameOf(p.student_id))
    .filter(Boolean)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <div className="flex items-center gap-2 pr-6">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            #{hadith.hadith_number}
          </span>
          <span className="text-xs text-text-tertiary">
            {topic.icon} {topic.label}
          </span>
        </div>
        <DialogTitle className="sr-only">Hadith {hadith.hadith_number}</DialogTitle>

        <p
          dir="rtl"
          className="rounded-xl bg-background-gray-primary p-5 text-center font-hadith text-2xl leading-loose text-text-primary sm:text-3xl"
        >
          {hadith.arabic_text}
        </p>
        <div>
          <p className="text-xs font-medium uppercase text-text-tertiary">Meaning</p>
          <p className="mt-1 text-sm italic text-text-primary">
            &ldquo;{hadith.english_text}&rdquo;
          </p>
        </div>
        {hadith.urdu_text && (
          <p dir="rtl" className="text-right text-sm font-medium text-text-primary">
            {hadith.urdu_text}
          </p>
        )}
        {hadith.kids_lesson && (
          <p className="rounded-lg bg-primary/10 p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Kid&apos;s lesson: </span>
            {hadith.kids_lesson}
          </p>
        )}
        <p className="flex justify-between gap-3 text-xs text-text-tertiary">
          <span>{hadith.narrator}</span>
          <span>{hadith.reference}</span>
        </p>

        <div className="grid gap-3 border-t border-border-primary pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary">Learning now</p>
            <p className="mt-1 text-text-secondary">{learners.join(", ") || "No one"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary">Memorized</p>
            <p className="mt-1 text-text-secondary">{memorizers.join(", ") || "No one yet"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAssignTo(hadith)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))]"
        >
          <Send className="h-4 w-4" />
          Assign to students…
        </button>
      </DialogContent>
    </Dialog>
  )
}
