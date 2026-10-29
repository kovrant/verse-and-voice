"use client"

import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Play,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AGE_GROUP_LABELS, CATEGORY_LABELS } from "@/lib/quizzes/quiz-engine"
import type { Quiz, QuizAssignment, QuizAttempt, QuizQuestion } from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import type { Student } from "@/lib/utils"

interface LinkedStory {
  id: string
  title: string
  category: string
  target_age_group: string | null
  summary: string | null
}

type AttemptWithStudent = QuizAttempt & {
  students?:
    | { id: string; name: string; guardian_name?: string | null }
    | { id: string; name: string; guardian_name?: string | null }[]
    | null
}

export default function TeacherQuizViewPage() {
  const router = useRouter()
  const params = useParams()
  const quizId = params?.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [linkedStory, setLinkedStory] = useState<LinkedStory | null>(null)
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [attempts, setAttempts] = useState<AttemptWithStudent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  // Assign Dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignSearch, setAssignSearch] = useState("")
  const [assignDueDate, setAssignDueDate] = useState("")
  const [savingAssign, setSavingAssign] = useState(false)

  // Interactive Student Preview Dialog
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewSelectedOption, setPreviewSelectedOption] = useState<string | null>(null)
  const [previewAnswerChecked, setPreviewAnswerChecked] = useState(false)
  const [previewScore, setPreviewScore] = useState(0)
  const [previewFinished, setPreviewFinished] = useState(false)

  const loadData = useCallback(async () => {
    if (!quizId) return
    try {
      const [quizRes, questionsRes, storyRes, assignRes, attemptsRes, studentsRes] =
        await Promise.all([
          supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle(),
          supabase
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", quizId)
            .order("order_index", { ascending: true }),
          supabase
            .from("islamic_history")
            .select("id, title, category, target_age_group, summary")
            .eq("quiz_id", quizId)
            .maybeSingle(),
          supabase
            .from("quiz_assignments")
            .select("*")
            .eq("quiz_id", quizId)
            .order("assigned_at", { ascending: false }),
          supabase
            .from("quiz_attempts")
            .select("*, students(id, name, guardian_name)")
            .eq("quiz_id", quizId)
            .order("completed_at", { ascending: false }),
          supabase.from("students").select("*").order("name"),
        ])

      if (quizRes.data) {
        setQuiz(quizRes.data as Quiz)
      }
      setQuestions((questionsRes.data as QuizQuestion[]) || [])
      setLinkedStory(storyRes.data as LinkedStory | null)
      setAssignments((assignRes.data as QuizAssignment[]) || [])
      setAttempts((attemptsRes.data as AttemptWithStudent[]) || [])
      setStudents((studentsRes.data as Student[]) || [])

      // Set initial assigned student IDs
      if (assignRes.data) {
        setSelectedStudentIds(assignRes.data.map((a: QuizAssignment) => a.student_id))
      }
    } catch (err) {
      console.error("Error loading quiz view data:", err)
      toast.error("Failed to load quiz details")
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Students lookup map
  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>()
    for (const s of students) {
      map.set(s.id, s)
    }
    return map
  }, [students])

  // Assigned students who have not yet submitted
  const pendingAssignments = useMemo(() => {
    const attemptedIds = new Set(attempts.map((a) => a.student_id))
    return assignments.filter((a) => !attemptedIds.has(a.student_id))
  }, [assignments, attempts])

  // Aggregate stats
  const stats = useMemo(() => {
    const totalAssigned = assignments.length
    const totalAttempts = attempts.length
    const passedAttempts = attempts.filter((a) => a.passed).length
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0
    return { totalAssigned, totalAttempts, passedAttempts, passRate }
  }, [assignments, attempts])

  // Filter students for assign modal
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = assignSearch.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.guardian_name?.toLowerCase().includes(q)
    })
  }, [students, assignSearch])

  // Handle Assign submission
  const handleSaveAssignments = async () => {
    if (!quiz) return
    setSavingAssign(true)
    try {
      const res = await fetch("/api/quizzes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          student_ids: selectedStudentIds,
          due_date: assignDueDate ? new Date(assignDueDate).toISOString() : null,
          reassign: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update assignments")
      }

      toast.success(`Updated assignments for ${selectedStudentIds.length} student(s)`)
      setAssignOpen(false)
      await loadData()
    } catch (err) {
      console.error("Failed to assign quiz:", err)
      toast.error("Failed to assign quiz. Please try again.")
    } finally {
      setSavingAssign(false)
    }
  }

  // Toggle publish
  const handleTogglePublish = async () => {
    if (!quiz) return
    try {
      const nextStatus = !quiz.is_published
      const { error } = await supabase
        .from("quizzes")
        .update({ is_published: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", quiz.id)

      if (error) throw error
      setQuiz((q) => (q ? { ...q, is_published: nextStatus } : null))
      toast.success(nextStatus ? "Quiz published" : "Quiz set to draft")
    } catch {
      toast.error("Failed to update status")
    }
  }

  // Delete quiz
  const handleDeleteQuiz = async () => {
    if (!quiz) return

    // Strict Rule: Published quizzes cannot be deleted. First they have to unpublish and then delete.
    if (quiz.is_published) {
      toast.error(
        "Published quizzes cannot be deleted. Please unpublish the quiz first before deleting.",
        {
          duration: 5000,
        },
      )
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete "${quiz.title}"? All student attempts will be deleted.`,
      )
    )
      return

    try {
      const res = await fetch("/api/quizzes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete quiz")
      }

      toast.success("Quiz deleted successfully")
      router.push("/teacher/quizzes")
    } catch (err: unknown) {
      console.error("Failed to delete quiz:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to delete quiz"
      toast.error(errorMsg)
    }
  }

  // Interactive Student Preview Helpers
  const startPreview = () => {
    setPreviewIndex(0)
    setPreviewSelectedOption(null)
    setPreviewAnswerChecked(false)
    setPreviewScore(0)
    setPreviewFinished(false)
    setPreviewOpen(true)
  }

  const handlePreviewCheck = () => {
    if (!questions[previewIndex] || !previewSelectedOption) return
    const currentQ = questions[previewIndex]
    const correctOpt = currentQ.options.find((o) => o.is_correct)
    const isCorrect = correctOpt?.id === previewSelectedOption
    if (isCorrect) {
      setPreviewScore((s) => s + 1)
    }
    setPreviewAnswerChecked(true)
  }

  const handlePreviewNext = () => {
    if (previewIndex < questions.length - 1) {
      setPreviewIndex((i) => i + 1)
      setPreviewSelectedOption(null)
      setPreviewAnswerChecked(false)
    } else {
      setPreviewFinished(true)
    }
  }

  if (loading) {
    return <PageLoading variant="dashboard" />
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center animate-fade-in-up">
        <HelpCircle className="mx-auto h-12 w-12 text-icon-tertiary" />
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Quiz Not Found</h2>
        <p className="mt-2 text-sm text-text-tertiary">
          This quiz may have been removed or does not exist.
        </p>
        <Button asChild className="mt-6 gap-2" variant="outline">
          <Link href="/teacher/quizzes">
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>
        </Button>
      </div>
    )
  }

  const cat = CATEGORY_LABELS[quiz.category] || CATEGORY_LABELS.general
  const ageLabel = AGE_GROUP_LABELS[quiz.age_group] || "All Ages"

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in-up pb-12">
      {/* Top Back & Action Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-text-secondary hover:text-text-primary"
        >
          <Link href="/teacher/quizzes">
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={quiz.is_published ? "outline" : "default"}
            onClick={handleTogglePublish}
            className="text-xs font-medium"
          >
            {quiz.is_published ? "Unpublish Quiz" : "Publish Quiz"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={startPreview}
            className="gap-1.5 text-xs font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            Preview as Student
          </Button>

          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Users className="h-3.5 w-3.5" />
            Assign to Students ({assignments.length})
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteQuiz}
            className={`gap-1.5 text-xs font-medium ${
              quiz.is_published
                ? "text-text-tertiary/50 hover:bg-background-gray-primary"
                : "text-destructive hover:text-destructive hover:bg-destructive/10"
            }`}
            title={
              quiz.is_published
                ? "Published quizzes cannot be deleted (Unpublish first)"
                : "Delete Quiz"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Quiz Hero Card */}
      <Card className="overflow-hidden">
        <CardHeader className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1 bg-background-gray-secondary text-xs font-medium text-text-secondary"
            >
              <span>{cat.label}</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {ageLabel}
            </Badge>
            <Badge
              variant={quiz.is_published ? "default" : "warning"}
              className={`text-xs font-medium ${
                quiz.is_published ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" : ""
              }`}
            >
              {quiz.is_published ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-8 text-text-primary">{quiz.title}</h1>
            {quiz.description && (
              <p className="max-w-3xl text-sm text-text-tertiary">{quiz.description}</p>
            )}
          </div>

          {/* Linked Islamic History Story Banner */}
          {linkedStory && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-border p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-text-tertiary">
                    Linked Islamic History Storybook
                  </p>
                  <p className="text-sm font-medium text-text-primary">{linkedStory.title}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs font-medium">
                <Link href="/teacher/history">
                  <span>Open in Story Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Stats Metrics Bar */}
        <CardContent className="border-t border-border-primary p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-card-border p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-text-tertiary">
                <HelpCircle className="h-4 w-4 text-[#F97316]" />
                <span>Questions</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{questions.length}</p>
              <p className="text-[11px] text-text-tertiary">Multiple-choice &amp; True/False</p>
            </div>

            <div className="rounded-lg border border-card-border p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-text-tertiary">
                <Award className="h-4 w-4 text-[#F97316]" />
                <span>Passing Mark</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{quiz.passing_score}%</p>
              <p className="text-[11px] text-text-tertiary">Required to unlock badge</p>
            </div>

            <div className="rounded-lg border border-card-border p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-text-tertiary">
                <Users className="h-4 w-4 text-[#0EA5E9]" />
                <span>Assigned</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.totalAssigned}</p>
              <p className="text-[11px] text-text-tertiary">Students enrolled</p>
            </div>

            <div className="rounded-lg border border-card-border p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-text-tertiary">
                <GraduationCap className="h-4 w-4 text-[#22C55E]" />
                <span>Pass Rate</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.passRate}%</p>
              <p className="text-[11px] text-text-tertiary">{stats.totalAttempts} total attempts</p>
            </div>
          </div>

          {/* Reward Badge Preview */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-card-border p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-2xl">
              🏆
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-text-tertiary">
                Unlockable Student Badge
              </p>
              <p className="truncate text-sm font-medium text-text-primary">{quiz.badge_title}</p>
              {quiz.badge_description && (
                <p className="text-xs text-text-tertiary">{quiz.badge_description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions & Answer Key Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-icon-secondary" />
            <h2 className="text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              Questions &amp; Answer Key ({questions.length})
            </h2>
          </div>
          <span className="text-xs font-medium text-text-tertiary">
            Green highlight indicates the correct answer
          </span>
        </div>

        {questions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-text-tertiary">No questions found in this quiz.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIndex) => {
              return (
                <Card key={q.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-3 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-medium text-text-secondary">
                        Question {qIndex + 1} of {questions.length}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-background-gray-secondary text-[11px] font-medium capitalize text-text-secondary"
                      >
                        {q.question_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-base font-medium leading-relaxed text-text-primary">
                      {q.question_text}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4 sm:p-5">
                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isCorrect = opt.is_correct
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors ${
                              isCorrect
                                ? "border-green-500/50 bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                                : "border-card-border text-text-secondary"
                            }`}
                          >
                            <span className="leading-snug">{opt.text}</span>
                            {isCorrect && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-transparent bg-[hsl(var(--success)/0.12)] text-[11px] font-medium text-[hsl(var(--success))]"
                              >
                                <Check className="h-3 w-3 mr-0.5" /> Correct
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="space-y-0.5 rounded-lg bg-[rgba(14,165,233,0.10)] p-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1.5 font-medium text-text-primary">
                          💡 Teaching Note &amp; Explanation:
                        </span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Student Submissions & Activity Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-icon-secondary" />
            <h2 className="text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              Student Submissions ({attempts.length})
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAssignOpen(true)}
            className="gap-1 text-xs font-medium"
          >
            <Users className="h-3.5 w-3.5" />
            Manage Students
          </Button>
        </div>

        {attempts.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-background-gray-secondary text-icon-secondary">
              <UserCheck className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium text-text-primary">No attempts recorded yet</p>
            <p className="mt-0.5 text-sm text-text-tertiary">
              When students complete this quest, their scores and badges will appear here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-primary text-xs font-medium uppercase text-text-tertiary">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const studentObj = Array.isArray(attempt.students)
                      ? attempt.students[0]
                      : attempt.students
                    const studentName = studentObj?.name || "Student"
                    const passed = attempt.passed

                    return (
                      <tr
                        key={attempt.id}
                        className="border-b border-border-primary transition-colors last:border-0 hover:bg-background-gray-primary"
                      >
                        <td className="px-4 py-3 font-medium text-text-primary">{studentName}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {attempt.score} / {attempt.total_questions}
                        </td>
                        <td className="px-4 py-3 font-semibold text-text-primary">
                          {attempt.percentage}%
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={passed ? "default" : "outline"}
                            className={`text-[11px] font-medium ${
                              passed
                                ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {passed ? "🏆 Passed" : "💪 Needs Review"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-tertiary">
                          {new Date(attempt.completed_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pending Enrolled Students List */}
        {pendingAssignments.length > 0 && (
          <div className="space-y-2 rounded-xl border border-card-border bg-card-background p-4">
            <p className="text-xs font-medium uppercase text-text-tertiary">
              Enrolled Students Awaiting Submission ({pendingAssignments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingAssignments.map((pa) => {
                const s = studentsMap.get(pa.student_id)
                return (
                  <Badge
                    key={pa.id}
                    variant="secondary"
                    className="bg-background-gray-secondary px-2.5 py-1 text-xs font-medium text-text-secondary"
                  >
                    ⏳ {s?.name || "Student"}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ASSIGN STUDENTS DIALOG ── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Quiz to Students
            </DialogTitle>
            <DialogDescription>
              Select students who will see this quiz in their student dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-icon-tertiary" />
              <Input
                placeholder="Search students..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-text-tertiary">
              <span>
                {selectedStudentIds.length} of {students.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                  className="font-medium text-primary hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="font-medium text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Students list */}
            <div className="flex-1 overflow-y-auto max-h-[220px] space-y-1 rounded-lg border border-card-border p-2">
              {filteredStudents.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-tertiary">No students found</p>
              ) : (
                filteredStudents.map((s) => {
                  const checked = selectedStudentIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        checked
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-text-primary hover:bg-background-gray-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds((prev) => [...prev, s.id])
                            } else {
                              setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id))
                            }
                          }}
                          className="rounded border-card-border text-primary accent-primary"
                        />
                        <span>{s.name}</span>
                      </div>
                      {s.guardian_name && (
                        <span className="text-[11px] text-text-tertiary">({s.guardian_name})</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            {/* Optional Due Date */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-medium">Optional Due Date</Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(false)}
              disabled={savingAssign}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAssignments}
              disabled={savingAssign}
              className="font-medium"
            >
              {savingAssign ? "Saving..." : `Assign (${selectedStudentIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INTERACTIVE STUDENT PREVIEW DIALOG ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-xs font-medium text-primary"
              >
                Student Player Preview
              </Badge>
              {!previewFinished && questions.length > 0 && (
                <span className="text-xs font-medium text-text-tertiary">
                  Question {previewIndex + 1} of {questions.length}
                </span>
              )}
            </div>
            <DialogTitle className="text-lg font-semibold">{quiz.title}</DialogTitle>
          </DialogHeader>

          {previewFinished ? (
            <div className="py-6 text-center space-y-4">
              <span className="text-5xl block">
                {previewScore / questions.length >= quiz.passing_score / 100 ? "🏆" : "💪"}
              </span>
              <h3 className="text-xl font-semibold text-text-primary">
                {previewScore / questions.length >= quiz.passing_score / 100
                  ? "MashaAllah! Passed!"
                  : "Good Effort!"}
              </h3>
              <p className="text-sm text-text-tertiary">
                Score: {previewScore} / {questions.length} (
                {Math.round((previewScore / (questions.length || 1)) * 100)}%)
              </p>
              <Button onClick={startPreview} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : questions[previewIndex] ? (
            <div className="space-y-4 py-2">
              <p className="text-base font-medium text-text-primary">
                {questions[previewIndex].question_text}
              </p>

              <div className="space-y-2">
                {questions[previewIndex].options.map((opt) => {
                  const isSelected = previewSelectedOption === opt.id
                  const showFeedback = previewAnswerChecked
                  let btnStyle = "border-card-border hover:bg-background-gray-primary"

                  if (showFeedback) {
                    if (opt.is_correct) {
                      btnStyle =
                        "border-green-500 bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                    } else if (isSelected) {
                      btnStyle = "border-destructive bg-destructive/10 text-destructive"
                    }
                  } else if (isSelected) {
                    btnStyle = "border-primary bg-primary/10 font-medium text-primary"
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={previewAnswerChecked}
                      onClick={() => setPreviewSelectedOption(opt.id)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${btnStyle}`}
                    >
                      <span>{opt.text}</span>
                      {showFeedback && opt.is_correct && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      )}
                      {showFeedback && isSelected && !opt.is_correct && (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                    </button>
                  )
                })}
              </div>

              {previewAnswerChecked && questions[previewIndex].explanation && (
                <div className="rounded-lg bg-[rgba(14,165,233,0.10)] p-3 text-xs text-text-secondary">
                  <span className="block font-medium text-text-primary">💡 Explanation:</span>
                  <p className="mt-0.5">{questions[previewIndex].explanation}</p>
                </div>
              )}

              <DialogFooter className="pt-2">
                {!previewAnswerChecked ? (
                  <Button
                    onClick={handlePreviewCheck}
                    disabled={!previewSelectedOption}
                    className="w-full font-medium"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={handlePreviewNext} className="w-full font-medium">
                    {previewIndex < questions.length - 1 ? "Next Question →" : "Finish Preview 🎉"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
