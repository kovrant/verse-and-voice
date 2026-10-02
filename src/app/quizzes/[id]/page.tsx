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
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
import type {
  Quiz,
  QuizAssignment,
  QuizAttempt,
  QuizQuestion,
} from "@/lib/quizzes/types"
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
  students?: { id: string; name: string; guardian_name?: string | null } | { id: string; name: string; guardian_name?: string | null }[] | null
}

export default function TeacherQuizViewPage() {
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
            .from("history_stories")
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
        <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-bold">Quiz Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This quiz may have been removed or does not exist.
        </p>
        <Button asChild className="mt-6 gap-2" variant="outline">
          <Link href="/quizzes">
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
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/quizzes">
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={quiz.is_published ? "outline" : "default"}
            onClick={handleTogglePublish}
            className="text-xs font-semibold"
          >
            {quiz.is_published ? "Unpublish Quiz" : "Publish Quiz"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={startPreview}
            className="gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
          >
            <Play className="h-3.5 w-3.5" />
            Preview as Student
          </Button>

          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Users className="h-3.5 w-3.5" />
            Assign to Students ({assignments.length})
          </Button>
        </div>
      </div>

      {/* Main Quiz Hero Card */}
      <Card className="overflow-hidden border-border/70 shadow-soft">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 via-card to-card p-6 sm:p-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-bold gap-1">
              <span>{cat.label}</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {ageLabel}
            </Badge>
            <Badge
              variant={quiz.is_published ? "default" : "warning"}
              className="text-xs font-bold"
            >
              {quiz.is_published ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className="space-y-1">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-sm sm:text-base font-medium text-muted-foreground max-w-3xl">
                {quiz.description}
              </p>
            )}
          </div>

          {/* Linked Islamic History Story Banner */}
          {linkedStory && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/35 bg-teal-500/10 p-3.5 text-teal-800 dark:text-teal-200">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Linked Islamic History Storybook</p>
                  <p className="text-sm font-semibold">{linkedStory.title}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs font-bold border-teal-500/40 bg-card">
                <Link href="/history">
                  <span>Open in Story Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Stats Metrics Bar */}
        <CardContent className="p-6 border-t border-border/60 bg-card/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <HelpCircle className="h-4 w-4 text-amber-500" />
                <span>Questions</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{questions.length}</p>
              <p className="text-[11px] text-muted-foreground">Multiple-choice &amp; True/False</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Passing Mark</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{quiz.passing_score}%</p>
              <p className="text-[11px] text-muted-foreground">Required to unlock badge</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Users className="h-4 w-4 text-teal-500" />
                <span>Assigned</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalAssigned}</p>
              <p className="text-[11px] text-muted-foreground">Students enrolled</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                <span>Pass Rate</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.passRate}%</p>
              <p className="text-[11px] text-muted-foreground">{stats.totalAttempts} total attempts</p>
            </div>
          </div>

          {/* Reward Badge Preview */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl">
              🏆
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Unlockable Student Badge
              </p>
              <p className="text-sm font-bold text-foreground truncate">{quiz.badge_title}</p>
              {quiz.badge_description && (
                <p className="text-xs text-muted-foreground">{quiz.badge_description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions & Answer Key Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Questions &amp; Answer Key ({questions.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Green highlight indicates the correct answer
          </span>
        </div>

        {questions.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No questions found in this quiz.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIndex) => {
              return (
                <Card key={q.id} className="border-border/70 shadow-soft overflow-hidden">
                  <CardHeader className="p-4 sm:p-5 bg-card/60 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-bold">
                        Question {qIndex + 1} of {questions.length}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] capitalize font-medium">
                        {q.question_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-base font-bold text-foreground leading-relaxed">
                      {q.question_text}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isCorrect = opt.is_correct
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition-all ${
                              isCorrect
                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold"
                                : "border-border/60 bg-secondary/20 text-muted-foreground"
                            }`}
                          >
                            <span className="leading-snug">{opt.text}</span>
                            {isCorrect && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black"
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
                      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200 space-y-0.5">
                        <span className="font-bold flex items-center gap-1.5">
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
            <GraduationCap className="h-5 w-5 text-teal-500" />
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Student Submissions ({attempts.length})
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAssignOpen(true)}
            className="text-xs gap-1 font-semibold"
          >
            <Users className="h-3.5 w-3.5" />
            Manage Students
          </Button>
        </div>

        {attempts.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <UserCheck className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
            <p className="mt-2 text-sm font-semibold text-foreground">No attempts recorded yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When students complete this quest, their scores and badges will appear here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/70 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {attempts.map((attempt) => {
                    const studentObj = Array.isArray(attempt.students)
                      ? attempt.students[0]
                      : attempt.students
                    const studentName = studentObj?.name || "Student"
                    const passed = attempt.passed

                    return (
                      <tr key={attempt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {studentName}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {attempt.score} / {attempt.total_questions}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {attempt.percentage}%
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={passed ? "default" : "outline"}
                            className={`text-[10px] font-bold ${
                              passed
                                ? "bg-emerald-600 text-white"
                                : "text-amber-600 border-amber-500/40 bg-amber-500/10"
                            }`}
                          >
                            {passed ? "🏆 Passed" : "💪 Needs Review"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
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
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Enrolled Students Awaiting Submission ({pendingAssignments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingAssignments.map((pa) => {
                const s = studentsMap.get(pa.student_id)
                return (
                  <Badge
                    key={pa.id}
                    variant="secondary"
                    className="text-xs font-semibold py-1 px-2.5 bg-muted/60 text-foreground"
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
              <Users className="h-5 w-5 text-emerald-600" />
              Assign Quiz to Students
            </DialogTitle>
            <DialogDescription>
              Select students who will see this quiz in their student dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
              <span>{selectedStudentIds.length} of {students.length} selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                  className="font-semibold text-primary hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Students list */}
            <div className="flex-1 overflow-y-auto max-h-[220px] rounded-xl border border-border/60 p-2 space-y-1">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No students found</p>
              ) : (
                filteredStudents.map((s) => {
                  const checked = selectedStudentIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        checked ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40"
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
                          className="rounded border-border text-primary"
                        />
                        <span>{s.name}</span>
                      </div>
                      {s.guardian_name && (
                        <span className="text-[10px] text-muted-foreground">
                          ({s.guardian_name})
                        </span>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            {/* Optional Due Date */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold">Optional Due Date</Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)} disabled={savingAssign}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAssignments}
              disabled={savingAssign}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-xs font-bold">
                Student Player Preview
              </Badge>
              {!previewFinished && questions.length > 0 && (
                <span className="text-xs font-semibold text-muted-foreground">
                  Question {previewIndex + 1} of {questions.length}
                </span>
              )}
            </div>
            <DialogTitle className="text-lg font-bold">{quiz.title}</DialogTitle>
          </DialogHeader>

          {previewFinished ? (
            <div className="py-6 text-center space-y-4">
              <span className="text-5xl block">
                {previewScore / questions.length >= quiz.passing_score / 100 ? "🏆" : "💪"}
              </span>
              <h3 className="text-xl font-bold">
                {previewScore / questions.length >= quiz.passing_score / 100
                  ? "MashaAllah! Passed!"
                  : "Good Effort!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Score: {previewScore} / {questions.length} (
                {Math.round((previewScore / (questions.length || 1)) * 100)}%)
              </p>
              <Button onClick={startPreview} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : questions[previewIndex] ? (
            <div className="space-y-4 py-2">
              <p className="text-base font-bold text-foreground">
                {questions[previewIndex].question_text}
              </p>

              <div className="space-y-2">
                {questions[previewIndex].options.map((opt) => {
                  const isSelected = previewSelectedOption === opt.id
                  const showFeedback = previewAnswerChecked
                  let btnStyle = "border-border/70 hover:border-amber-500/50"

                  if (showFeedback) {
                    if (opt.is_correct) {
                      btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold"
                    } else if (isSelected) {
                      btnStyle = "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200"
                    }
                  } else if (isSelected) {
                    btnStyle = "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold"
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={previewAnswerChecked}
                      onClick={() => setPreviewSelectedOption(opt.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm text-left transition-all ${btnStyle}`}
                    >
                      <span>{opt.text}</span>
                      {showFeedback && opt.is_correct && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                      {showFeedback && isSelected && !opt.is_correct && (
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {previewAnswerChecked && questions[previewIndex].explanation && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
                  <span className="font-bold block">💡 Explanation:</span>
                  <p className="mt-0.5">{questions[previewIndex].explanation}</p>
                </div>
              )}

              <DialogFooter className="pt-2">
                {!previewAnswerChecked ? (
                  <Button
                    onClick={handlePreviewCheck}
                    disabled={!previewSelectedOption}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={handlePreviewNext} className="w-full font-bold">
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
