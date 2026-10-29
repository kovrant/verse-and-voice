"use client"

import {
  Award,
  CheckCircle2,
  ChevronRight,
  Eye,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AGE_GROUP_LABELS, CATEGORY_LABELS } from "@/lib/quizzes/quiz-engine"
import type {
  QuestionType,
  Quiz,
  QuizAgeGroup,
  QuizAssignment,
  QuizAttempt,
  QuizCategory,
  QuizOption,
  QuizQuestion,
} from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import type { Student } from "@/lib/utils"

type AttemptWithStudentJoin = QuizAttempt & {
  students?:
    | { id: string; name: string; guardian_name?: string | null }
    | { id: string; name: string; guardian_name?: string | null }[]
    | null
}

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [attempts, setAttempts] = useState<AttemptWithStudentJoin[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [ageFilter, setAgeFilter] = useState<string>("all")

  // Modals state
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiCategory, setAiCategory] = useState<QuizCategory>("general")
  const [aiAgeGroup, setAiAgeGroup] = useState<QuizAgeGroup>("all")
  const [aiCount, setAiCount] = useState(4)
  const [generatingAi, setGeneratingAi] = useState(false)

  // Manual / Edit Builder state
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderQuiz, setBuilderQuiz] = useState<{
    id?: string
    title: string
    description: string
    category: QuizCategory
    age_group: QuizAgeGroup
    passing_score: number
    badge_title: string
    badge_description: string
    questions: Array<{
      id?: string
      question_text: string
      question_type: QuestionType
      options: QuizOption[]
      explanation: string
    }>
  }>({
    title: "",
    description: "",
    category: "general",
    age_group: "all",
    passing_score: 80,
    badge_title: "",
    badge_description: "",
    questions: [],
  })
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedQuizToAssign, setSelectedQuizToAssign] = useState<Quiz | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignStudentSearch, setAssignStudentSearch] = useState("")
  const [assignDueDate, setAssignDueDate] = useState("")
  const [savingAssignments, setSavingAssignments] = useState(false)

  // Submissions Modal
  const [resultsModalOpen, setResultsModalOpen] = useState(false)
  const [selectedQuizForResults, setSelectedQuizForResults] = useState<Quiz | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [quizzesRes, studentsRes, assignRes, attemptsRes] = await Promise.all([
        supabase
          .from("quizzes")
          .select("*, quiz_questions(*)")
          .order("created_at", { ascending: false }),
        supabase.from("students").select("*").order("name"),
        supabase.from("quiz_assignments").select("*"),
        supabase
          .from("quiz_attempts")
          .select("*, students(id, name, guardian_name)")
          .order("completed_at", { ascending: false }),
      ])

      type RawQuizRow = Quiz & { quiz_questions?: QuizQuestion[] }
      const mappedQuizzes = ((quizzesRes.data as RawQuizRow[]) || []).map((q) => ({
        ...q,
        questions: [...(q.quiz_questions || [])].sort((a, b) => a.order_index - b.order_index),
      }))

      setQuizzes(mappedQuizzes)
      setStudents((studentsRes.data as Student[]) || [])
      setAssignments((assignRes.data as QuizAssignment[]) || [])
      setAttempts((attemptsRes.data as AttemptWithStudentJoin[]) || [])
    } catch (err) {
      console.error("Error loading quizzes data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Student Lookup Map
  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>()
    for (const s of students) {
      map.set(s.id, s)
    }
    return map
  }, [students])

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.badge_title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || q.category === categoryFilter
      const matchesAge = ageFilter === "all" || q.age_group === ageFilter || q.age_group === "all"
      return matchesSearch && matchesCategory && matchesAge
    })
  }, [quizzes, searchQuery, categoryFilter, ageFilter])

  // Stats calculation
  const stats = useMemo(() => {
    const totalQuizzes = quizzes.length
    const totalAssigned = assignments.length
    const totalAttempts = attempts.length
    const passedAttempts = attempts.filter((a) => a.passed).length
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0
    return { totalQuizzes, totalAssigned, totalAttempts, passRate }
  }, [quizzes, assignments, attempts])

  // AI Generation Handler
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return
    setGeneratingAi(true)
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          category: aiCategory,
          age_group: aiAgeGroup,
          count: aiCount,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate quiz")
      const data = await res.json()
      if (data.quiz) {
        setBuilderQuiz({
          title: data.quiz.title,
          description: data.quiz.description,
          category: data.quiz.category,
          age_group: data.quiz.age_group,
          passing_score: data.quiz.passing_score || 80,
          badge_title: data.quiz.badge_title,
          badge_description: data.quiz.badge_description,
          questions: data.quiz.questions,
        })
        setAiModalOpen(false)
        setBuilderOpen(true)
        if (data.source === "gemini_ai") {
          toast.success("Quiz generated with Gemini AI!")
        } else if (data.notice) {
          toast.info(
            "Generated using Islamic question bank. Configure GEMINI_API_KEY in .env.local for live AI.",
          )
        }
      }
    } catch (err) {
      console.error("AI quiz generation error:", err)
      toast.error("Could not generate quiz. Please try again or create manually.")
    } finally {
      setGeneratingAi(false)
    }
  }

  // Open manual builder
  const handleOpenManualBuilder = (quizToEdit?: Quiz) => {
    if (quizToEdit) {
      setBuilderQuiz({
        id: quizToEdit.id,
        title: quizToEdit.title,
        description: quizToEdit.description || "",
        category: quizToEdit.category,
        age_group: quizToEdit.age_group,
        passing_score: quizToEdit.passing_score,
        badge_title: quizToEdit.badge_title,
        badge_description: quizToEdit.badge_description || "",
        questions: (quizToEdit.questions || []).map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          explanation: q.explanation || "",
        })),
      })
    } else {
      setBuilderQuiz({
        title: "",
        description: "",
        category: "general",
        age_group: "all",
        passing_score: 80,
        badge_title: "",
        badge_description: "",
        questions: [
          {
            question_text: "",
            question_type: "single_choice",
            options: [
              { id: "opt1", text: "", is_correct: true },
              { id: "opt2", text: "", is_correct: false },
              { id: "opt3", text: "", is_correct: false },
              { id: "opt4", text: "", is_correct: false },
            ],
            explanation: "",
          },
        ],
      })
    }
    setBuilderOpen(true)
  }

  // Save Quiz to Supabase
  const handleSaveQuiz = async () => {
    if (!builderQuiz.title.trim()) {
      toast.error("Please enter a Quiz Title")
      return
    }
    if (builderQuiz.questions.length === 0) {
      toast.error("Please add at least one question")
      return
    }

    setSavingQuiz(true)
    try {
      const badgeSlug = `badge_quiz_${builderQuiz.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`

      let quizId = builderQuiz.id

      if (quizId) {
        // Update existing quiz
        const { error: updateErr } = await supabase
          .from("quizzes")
          .update({
            title: builderQuiz.title,
            description: builderQuiz.description,
            category: builderQuiz.category,
            age_group: builderQuiz.age_group,
            passing_score: builderQuiz.passing_score,
            badge_title: builderQuiz.badge_title || `${builderQuiz.title} Hero`,
            badge_description:
              builderQuiz.badge_description || `Earned for completing ${builderQuiz.title}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", quizId)

        if (updateErr) throw updateErr

        // Replace questions
        const { error: delErr } = await supabase
          .from("quiz_questions")
          .delete()
          .eq("quiz_id", quizId)
        if (delErr) throw delErr
      } else {
        // Insert new quiz
        const { data: created, error } = await supabase
          .from("quizzes")
          .insert({
            title: builderQuiz.title,
            description: builderQuiz.description,
            category: builderQuiz.category,
            age_group: builderQuiz.age_group,
            passing_score: builderQuiz.passing_score,
            badge_slug: badgeSlug,
            badge_title: builderQuiz.badge_title || `${builderQuiz.title} Hero`,
            badge_description:
              builderQuiz.badge_description || `Earned for completing ${builderQuiz.title}`,
          })
          .select("id")
          .single()

        if (error || !created) throw error || new Error("Failed to insert quiz")
        quizId = created.id
      }

      // Insert questions
      const questionsToInsert = builderQuiz.questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        explanation: q.explanation,
        order_index: idx + 1,
      }))

      const { error: insErr } = await supabase.from("quiz_questions").insert(questionsToInsert)
      if (insErr) throw insErr

      toast.success(builderQuiz.id ? "Quiz updated!" : "Quiz created!")
      setBuilderOpen(false)
      await loadData()
    } catch (err) {
      console.error("Error saving quiz:", err)
      toast.error("Failed to save quiz. Please check fields and try again.")
    } finally {
      setSavingQuiz(false)
    }
  }

  // Delete Quiz
  const handleDeleteQuiz = async (quiz: Quiz) => {
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
      await loadData()
    } catch (err: unknown) {
      console.error("Failed to delete quiz:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to delete quiz"
      toast.error(errorMsg)
    }
  }

  // Assign Quiz
  const handleOpenAssign = (quiz: Quiz) => {
    setSelectedQuizToAssign(quiz)
    const existingAssigned = assignments
      .filter((a) => a.quiz_id === quiz.id)
      .map((a) => a.student_id)
    setSelectedStudentIds(existingAssigned)
    setAssignDueDate("")
    setAssignModalOpen(true)
  }

  const handleSaveAssignments = async () => {
    if (!selectedQuizToAssign) return
    setSavingAssignments(true)
    try {
      const res = await fetch("/api/quizzes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: selectedQuizToAssign.id,
          student_ids: selectedStudentIds,
          due_date: assignDueDate || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to save assignments")

      toast.success("Quiz assignments saved")
      setAssignModalOpen(false)
      await loadData()
    } catch (err) {
      console.error("Error saving assignments:", err)
      toast.error("Failed to assign quiz.")
    } finally {
      setSavingAssignments(false)
    }
  }

  // View Results
  const handleOpenResults = (quiz: Quiz) => {
    setSelectedQuizForResults(quiz)
    setResultsModalOpen(true)
  }

  // Quick Re-assign Single Student (Allow Retake)
  const [reassigningStudentId, setReassigningStudentId] = useState<string | null>(null)
  const handleReassignSingle = async (quizId: string, studentId: string) => {
    setReassigningStudentId(studentId)
    try {
      const res = await fetch("/api/quizzes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          student_ids: [studentId],
          reassign: true,
        }),
      })

      if (!res.ok) throw new Error("Failed to re-assign")
      const studentName = studentsMap.get(studentId)?.name || "Student"
      toast.success(
        `Re-assigned to ${studentName}! They can now retake this quest to improve their score.`,
      )
      await loadData()
    } catch (err) {
      console.error("Error re-assigning quiz:", err)
      toast.error("Could not re-assign quiz. Please try again.")
    } finally {
      setReassigningStudentId(null)
    }
  }

  if (loading) {
    return <PageLoading variant="grid-cards" />
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-icon-secondary" />
            Islamic Quiz Studio
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Create gamified Islamic knowledge quests with AI, assign to students, and reward
            achievement badges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => setAiModalOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
          <Button variant="outline" onClick={() => handleOpenManualBuilder()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Manually
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-tertiary">Total Quizzes</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.totalQuizzes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-tertiary">Assigned Quests</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.totalAssigned}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.10)] text-[#A855F7]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-tertiary">Total Attempts</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.totalAttempts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-tertiary">Pass Rate</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.passRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-tertiary" />
          <Input
            placeholder="Search quizzes by title, description, or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All Ages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-background-gray-secondary text-icon-secondary">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-text-primary">No quizzes found</p>
              <p className="text-sm text-text-tertiary">
                Try adjusting your search or generate a brand new quiz with AI!
              </p>
            </div>
            <Button onClick={() => setAiModalOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Quiz with AI
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz) => {
            const quizAssignments = assignments.filter((a) => a.quiz_id === quiz.id)
            const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id)
            const cat = CATEGORY_LABELS[quiz.category] || CATEGORY_LABELS.general
            const ageLabel = AGE_GROUP_LABELS[quiz.age_group] || "All Ages"

            return (
              <Card key={quiz.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-background-gray-secondary px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                      {cat.label}
                    </span>
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {ageLabel}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-1 text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                    <Link
                      href={`/teacher/quizzes/${quiz.id}`}
                      className="transition-colors hover:text-primary"
                    >
                      {quiz.title}
                    </Link>
                  </CardTitle>
                  <p className="line-clamp-2 min-h-[40px] text-sm text-text-tertiary">
                    {quiz.description || "No description provided."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  {/* Badge Reward Pill */}
                  <div className="flex items-center gap-2 rounded-lg bg-[rgba(249,115,22,0.10)] px-3 py-2 text-xs">
                    <Award className="h-4 w-4 shrink-0 text-[#F97316]" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{quiz.badge_title}</p>
                      <p className="text-[11px] text-text-tertiary">
                        Passing score: {quiz.passing_score}%
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 border-y border-border-primary py-2 text-center text-xs">
                    <div>
                      <p className="text-[11px] font-medium uppercase text-text-tertiary">
                        Questions
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {quiz.questions?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase text-text-tertiary">
                        Assigned
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {quizAssignments.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase text-text-tertiary">
                        Attempts
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {quizAttempts.length}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 gap-1 text-xs font-medium"
                    >
                      <Link href={`/teacher/quizzes/${quiz.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAssign(quiz)}
                      className="h-8 flex-1 gap-1 text-xs font-medium"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenResults(quiz)}
                      className="h-8 gap-1 px-2 text-xs text-text-secondary hover:text-text-primary"
                      title={`Results (${quizAttempts.length})`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      {quizAttempts.length}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenManualBuilder(quiz)}
                      className="h-8 w-8 p-0"
                      title="Edit Quiz"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteQuiz(quiz)}
                      className={`h-8 w-8 p-0 ${
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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── AI GENERATION MODAL ── */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Islamic Quiz with AI
            </DialogTitle>
            <DialogDescription>
              Enter any Islamic topic or event, and AI will create an authentic, age-appropriate
              quiz with questions, options, and &quot;Did you know?&quot; facts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="aiTopic">Topic / Theme</Label>
              <Input
                id="aiTopic"
                placeholder="e.g., Prophet Musa & the Red Sea, Ramadan Fasting, Cleanliness in Islam"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={aiCategory} onValueChange={(v) => setAiCategory(v as QuizCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Age Level</Label>
                <Select value={aiAgeGroup} onValueChange={(v) => setAiAgeGroup(v as QuizAgeGroup)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Number of Questions ({aiCount})</Label>
              <input
                type="range"
                min="3"
                max="8"
                step="1"
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAi}
              disabled={generatingAi || !aiTopic.trim()}
              className="gap-2"
            >
              {generatingAi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MANUAL / REVIEW BUILDER MODAL ── */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{builderQuiz.id ? "Edit Quiz Quest" : "Create Quiz Quest"}</DialogTitle>
            <DialogDescription>
              Configure the quiz details, badge rewards, and questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Quiz Title *</Label>
                <Input
                  value={builderQuiz.title}
                  onChange={(e) => setBuilderQuiz({ ...builderQuiz, title: e.target.value })}
                  placeholder="e.g., 5 Pillars of Islam Adventure"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={builderQuiz.description}
                  onChange={(e) => setBuilderQuiz({ ...builderQuiz, description: e.target.value })}
                  placeholder="Short exciting intro for the student..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={builderQuiz.category}
                  onValueChange={(v) =>
                    setBuilderQuiz({ ...builderQuiz, category: v as QuizCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select
                  value={builderQuiz.age_group}
                  onValueChange={(v) =>
                    setBuilderQuiz({ ...builderQuiz, age_group: v as QuizAgeGroup })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Badge Title (Unlocked on Pass)</Label>
                <Input
                  value={builderQuiz.badge_title}
                  onChange={(e) => setBuilderQuiz({ ...builderQuiz, badge_title: e.target.value })}
                  placeholder="e.g., Pillars Master"
                />
              </div>

              <div className="space-y-2">
                <Label>Passing Score Percentage ({builderQuiz.passing_score}%)</Label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={builderQuiz.passing_score}
                  onChange={(e) =>
                    setBuilderQuiz({ ...builderQuiz, passing_score: Number(e.target.value) || 80 })
                  }
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-border-primary pt-4">
                <h3 className="flex items-center gap-2 text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Questions ({builderQuiz.questions.length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setBuilderQuiz({
                      ...builderQuiz,
                      questions: [
                        ...builderQuiz.questions,
                        {
                          question_text: "",
                          question_type: "single_choice",
                          options: [
                            { id: "opt1", text: "", is_correct: true },
                            { id: "opt2", text: "", is_correct: false },
                            { id: "opt3", text: "", is_correct: false },
                            { id: "opt4", text: "", is_correct: false },
                          ],
                          explanation: "",
                        },
                      ],
                    })
                  }
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question
                </Button>
              </div>

              {builderQuiz.questions.map((q, qIndex) => (
                <div key={qIndex} className="space-y-3 rounded-lg border border-card-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase text-text-tertiary">
                      Question {qIndex + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setBuilderQuiz({
                          ...builderQuiz,
                          questions: builderQuiz.questions.filter((_, i) => i !== qIndex),
                        })
                      }
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Input
                    placeholder="Enter question text..."
                    value={q.question_text}
                    onChange={(e) => {
                      const updated = [...builderQuiz.questions]
                      updated[qIndex]!.question_text = e.target.value
                      setBuilderQuiz({ ...builderQuiz, questions: updated })
                    }}
                    className="font-medium"
                  />

                  {/* Options */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs text-text-tertiary">
                      Answer Options (Select the correct one)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={opt.id || optIndex}
                          className={`flex items-center gap-2 rounded-lg border p-2 ${
                            opt.is_correct
                              ? "border-green-500/50 bg-green-500/10"
                              : "border-card-border bg-card-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_q_${qIndex}`}
                            checked={opt.is_correct}
                            onChange={() => {
                              const updated = [...builderQuiz.questions]
                              const opts = updated[qIndex]!.options.map((o, idx) => ({
                                ...o,
                                is_correct: idx === optIndex,
                              }))
                              updated[qIndex]!.options = opts
                              setBuilderQuiz({ ...builderQuiz, questions: updated })
                            }}
                            className="h-4 w-4 accent-green-600"
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...builderQuiz.questions]
                              updated[qIndex]!.options[optIndex]!.text = e.target.value
                              setBuilderQuiz({ ...builderQuiz, questions: updated })
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            className="w-full bg-transparent text-sm focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="pt-1">
                    <Input
                      placeholder="Did you know? (Fact/Explanation shown after answering)"
                      value={q.explanation}
                      onChange={(e) => {
                        const updated = [...builderQuiz.questions]
                        updated[qIndex]!.explanation = e.target.value
                        setBuilderQuiz({ ...builderQuiz, questions: updated })
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuiz} disabled={savingQuiz} className="font-medium">
              {savingQuiz ? "Saving..." : "Save Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ASSIGN MODAL ── */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Quiz Quest
            </DialogTitle>
            <DialogDescription>
              Select which students should receive <strong>{selectedQuizToAssign?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-icon-tertiary" />
              <Input
                placeholder="Search students by name or guardian..."
                value={assignStudentSearch}
                onChange={(e) => setAssignStudentSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between border-b border-border-primary pb-1">
              <span className="text-xs font-medium text-text-tertiary">
                {selectedStudentIds.length} of {students.length} students selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (selectedStudentIds.length === students.length) {
                    setSelectedStudentIds([])
                  } else {
                    setSelectedStudentIds(students.map((s) => s.id))
                  }
                }}
                className="text-xs h-7"
              >
                {selectedStudentIds.length === students.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
              {students.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-tertiary">
                  No active students found in the database.
                </div>
              ) : (
                students
                  .filter(
                    (s) =>
                      assignStudentSearch.trim() === "" ||
                      s.name.toLowerCase().includes(assignStudentSearch.toLowerCase()) ||
                      s.guardian_name?.toLowerCase().includes(assignStudentSearch.toLowerCase()),
                  )
                  .map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id)
                    return (
                      <label
                        key={student.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors ${
                          isSelected
                            ? "border-primary/30 bg-primary/10"
                            : "border-card-border hover:bg-background-gray-primary"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedStudentIds(
                                  selectedStudentIds.filter((id) => id !== student.id),
                                )
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, student.id])
                              }
                            }}
                            className="h-4 w-4 rounded accent-primary"
                          />
                          <div>
                            <p className="text-sm font-medium leading-none text-text-primary">
                              {student.name}
                            </p>
                            {student.guardian_name && (
                              <p className="mt-0.5 text-[11px] text-text-tertiary">
                                Guardian: {student.guardian_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const attemptRow = attempts.find(
                            (a) =>
                              a.quiz_id === selectedQuizToAssign?.id && a.student_id === student.id,
                          )
                          const assignRow = assignments.find(
                            (a) =>
                              a.quiz_id === selectedQuizToAssign?.id && a.student_id === student.id,
                          )

                          if (attemptRow) {
                            return (
                              <Badge
                                className={
                                  attemptRow.passed
                                    ? "bg-[hsl(var(--success)/0.12)] text-[11px] font-medium text-[hsl(var(--success))]"
                                    : "bg-amber-500/15 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                                }
                              >
                                {attemptRow.passed
                                  ? `Passed (${attemptRow.percentage}%)`
                                  : `Score: ${attemptRow.percentage}%`}
                              </Badge>
                            )
                          }

                          if (assignRow?.status === "pending") {
                            return (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/30 text-[11px] font-normal text-amber-600"
                              >
                                Assigned
                              </Badge>
                            )
                          }

                          return null
                        })()}
                      </label>
                    )
                  })
              )}
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Optional Due Date</Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignments}
              disabled={savingAssignments}
              className="font-medium"
            >
              {savingAssignments ? "Saving..." : "Save Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESULTS & SUBMISSIONS MODAL ── */}
      <Dialog open={resultsModalOpen} onOpenChange={setResultsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#A855F7]" />
              Submissions & Scores: {selectedQuizForResults?.title}
            </DialogTitle>
            <DialogDescription>
              View student attempts, scores, and completion status.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(() => {
              const quizAttempts = attempts.filter((a) => a.quiz_id === selectedQuizForResults?.id)
              if (quizAttempts.length === 0) {
                return (
                  <div className="py-8 text-center text-sm text-text-tertiary">
                    No attempts submitted for this quiz yet.
                  </div>
                )
              }

              return (
                <div>
                  {quizAttempts.map((attempt) => {
                    const joinedStudent = Array.isArray(attempt.students)
                      ? attempt.students[0]
                      : attempt.students
                    const studentInfo =
                      studentsMap.get(attempt.student_id) || joinedStudent || attempt.student
                    const studentName = studentInfo?.name || "Student"
                    const guardianName =
                      studentsMap.get(attempt.student_id)?.guardian_name ??
                      joinedStudent?.guardian_name
                    const studentGuardian = guardianName ? `Parent/Guardian: ${guardianName}` : ""

                    return (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between border-b border-border-primary py-3 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 items-center justify-center rounded-lg ${
                              attempt.passed
                                ? "bg-[rgba(34,197,94,0.10)] text-[#22C55E]"
                                : "bg-[rgba(249,115,22,0.10)] text-[#F97316]"
                            }`}
                          >
                            {attempt.passed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{studentName}</p>
                            <p className="text-[11px] text-text-tertiary">
                              {studentGuardian ? `${studentGuardian} • ` : ""}
                              {new Date(attempt.completed_at).toLocaleDateString()} at{" "}
                              {new Date(attempt.completed_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-sm font-semibold text-text-primary">
                                {attempt.percentage}%
                              </span>
                              <Badge
                                className={
                                  attempt.passed
                                    ? "bg-[hsl(var(--success)/0.12)] text-[11px] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.18)]"
                                    : "bg-amber-500/15 text-[11px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                                }
                              >
                                {attempt.passed ? "Passed" : "Needs Review"}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-text-tertiary">
                              {attempt.score} / {attempt.total_questions} correct
                            </p>
                          </div>

                          {(() => {
                            const assignRow = assignments.find(
                              (a) =>
                                a.quiz_id === attempt.quiz_id &&
                                a.student_id === attempt.student_id,
                            )
                            const isPending = assignRow?.status === "pending"

                            if (isPending) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-amber-500/30 bg-amber-500/10 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                                >
                                  Retake Active
                                </Badge>
                              )
                            }

                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reassigningStudentId === attempt.student_id}
                                onClick={() =>
                                  handleReassignSingle(
                                    selectedQuizForResults!.id,
                                    attempt.student_id,
                                  )
                                }
                                className="h-7 shrink-0 gap-1 border-primary/30 text-xs font-medium text-primary hover:bg-primary/10"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {reassigningStudentId === attempt.student_id
                                  ? "Re-assigning..."
                                  : "Allow Retake"}
                              </Button>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
