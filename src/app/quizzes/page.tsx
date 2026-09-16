"use client"

import {
  Award,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"
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
  Quiz,
  QuizAgeGroup,
  QuizAssignment,
  QuizAttempt,
  QuizCategory,
  QuizOption,
} from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import type { Student } from "@/lib/utils"

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
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
      question_type: "single_choice" | "true_false"
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

      const mappedQuizzes = (quizzesRes.data || []).map((q: any) => ({
        ...q,
        questions: (q.quiz_questions || []).sort((a: any, b: any) => a.order_index - b.order_index),
      }))

      setQuizzes(mappedQuizzes as Quiz[])
      setStudents((studentsRes.data as Student[]) || [])
      setAssignments((assignRes.data as QuizAssignment[]) || [])
      setAttempts((attemptsRes.data as any[]) || [])
    } catch (err) {
      console.error("Error loading quizzes data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
      }
    } catch (err) {
      console.error("AI quiz generation error:", err)
      alert("Could not generate quiz. Please try again or create manually.")
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
          question_type: q.question_type as any,
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
      alert("Please enter a Quiz Title")
      return
    }
    if (builderQuiz.questions.length === 0) {
      alert("Please add at least one question")
      return
    }

    setSavingQuiz(true)
    try {
      const badgeSlug = `badge_quiz_${builderQuiz.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`

      let quizId = builderQuiz.id

      if (quizId) {
        // Update existing quiz
        await supabase
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

        // Replace questions
        await supabase.from("quiz_questions").delete().eq("quiz_id", quizId)
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

      await supabase.from("quiz_questions").insert(questionsToInsert)

      setBuilderOpen(false)
      await loadData()
    } catch (err) {
      console.error("Error saving quiz:", err)
      alert("Failed to save quiz. Please check fields and try again.")
    } finally {
      setSavingQuiz(false)
    }
  }

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? All student attempts will be deleted.")) return
    try {
      await supabase.from("quizzes").delete().eq("id", quizId)
      await loadData()
    } catch (err) {
      console.error("Failed to delete quiz:", err)
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
      const quizId = selectedQuizToAssign.id

      // Delete removed assignments
      const currentAssigned = assignments.filter((a) => a.quiz_id === quizId)
      const toRemove = currentAssigned.filter((a) => !selectedStudentIds.includes(a.student_id))

      if (toRemove.length > 0) {
        await supabase
          .from("quiz_assignments")
          .delete()
          .in(
            "id",
            toRemove.map((a) => a.id),
          )
      }

      // Add newly assigned
      const newlyAdded = selectedStudentIds.filter(
        (id) => !currentAssigned.some((a) => a.student_id === id),
      )

      if (newlyAdded.length > 0) {
        const rows = newlyAdded.map((studentId) => ({
          quiz_id: quizId,
          student_id: studentId,
          status: "pending",
          due_date: assignDueDate ? new Date(assignDueDate).toISOString() : null,
        }))
        await supabase.from("quiz_assignments").insert(rows)
      }

      setAssignModalOpen(false)
      await loadData()
    } catch (err) {
      console.error("Error saving assignments:", err)
      alert("Failed to assign quiz.")
    } finally {
      setSavingAssignments(false)
    }
  }

  // View Results
  const handleOpenResults = (quiz: Quiz) => {
    setSelectedQuizForResults(quiz)
    setResultsModalOpen(true)
  }

  if (loading) {
    return <PageLoading variant="grid-cards" />
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Islamic Quiz Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create gamified Islamic knowledge quests with AI, assign to students, and reward achievement badges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setAiModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm font-semibold gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenManualBuilder()}
            className="gap-2 border-border/80"
          >
            <Plus className="h-4 w-4" />
            Create Manually
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Quizzes</p>
              <p className="text-xl font-bold">{stats.totalQuizzes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assigned Quests</p>
              <p className="text-xl font-bold">{stats.totalAssigned}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Attempts</p>
              <p className="text-xl font-bold">{stats.totalAttempts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pass Rate</p>
              <p className="text-xl font-bold">{stats.passRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No quizzes found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or generate a brand new quiz with AI!
              </p>
            </div>
            <Button
              onClick={() => setAiModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium gap-2"
            >
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
              <Card
                key={quiz.id}
                className="flex flex-col justify-between border-border/70 hover:border-amber-500/40 transition-all shadow-sm hover:shadow-soft"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                      {cat.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {ageLabel}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold line-clamp-1">{quiz.title}</CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {quiz.description || "No description provided."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  {/* Badge Reward Pill */}
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs">
                    <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-amber-700 dark:text-amber-300 truncate">
                        {quiz.badge_title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Passing score: {quiz.passing_score}%
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 border-y border-border/40">
                    <div>
                      <p className="text-muted-foreground text-[10px]">Questions</p>
                      <p className="font-bold">{quiz.questions?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Assigned</p>
                      <p className="font-bold">{quizAssignments.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Attempts</p>
                      <p className="font-bold">{quizAttempts.length}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleOpenAssign(quiz)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 h-8"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenResults(quiz)}
                      className="flex-1 text-xs gap-1.5 h-8"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Results ({quizAttempts.length})
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
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Quiz"
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
              <Sparkles className="h-5 w-5 text-amber-500" />
              Generate Islamic Quiz with AI
            </DialogTitle>
            <DialogDescription>
              Enter any Islamic topic or event, and AI will create an authentic, age-appropriate quiz with questions, options, and &quot;Did you know?&quot; facts.
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
                <Select value={aiCategory} onValueChange={(v: any) => setAiCategory(v)}>
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
                <Select value={aiAgeGroup} onValueChange={(v: any) => setAiAgeGroup(v)}>
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
                className="w-full accent-amber-500"
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
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2"
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
            <DialogTitle>
              {builderQuiz.id ? "Edit Quiz Quest" : "Create Quiz Quest"}
            </DialogTitle>
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
                  onValueChange={(v: any) => setBuilderQuiz({ ...builderQuiz, category: v })}
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
                  onValueChange={(v: any) => setBuilderQuiz({ ...builderQuiz, age_group: v })}
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
              <div className="flex items-center justify-between border-t border-border/80 pt-4">
                <h3 className="font-bold text-base flex items-center gap-2">
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
                <div
                  key={qIndex}
                  className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-muted-foreground">
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
                    <Label className="text-xs text-muted-foreground">
                      Answer Options (Select the correct one)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={opt.id || optIndex}
                          className={`flex items-center gap-2 rounded-lg border p-2 ${
                            opt.is_correct
                              ? "border-emerald-500/60 bg-emerald-500/10"
                              : "border-border/60 bg-card"
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
                            className="accent-emerald-600 h-4 w-4"
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
            <Button
              onClick={handleSaveQuiz}
              disabled={savingQuiz}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
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
              <Users className="h-5 w-5 text-emerald-600" />
              Assign Quiz Quest
            </DialogTitle>
            <DialogDescription>
              Select which students should receive <strong>{selectedQuizToAssign?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students by name or guardian..."
                value={assignStudentSearch}
                onChange={(e) => setAssignStudentSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="text-xs font-semibold text-muted-foreground">
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

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {students.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
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
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-border/60 hover:bg-secondary/60"
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
                            className="accent-emerald-600 h-4 w-4 rounded"
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{student.name}</p>
                            {student.guardian_name && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Guardian: {student.guardian_name}
                              </p>
                            )}
                          </div>
                        </div>
                        {student.status && (
                          <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                            {student.status}
                          </Badge>
                        )}
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
              <GraduationCap className="h-5 w-5 text-purple-600" />
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
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No attempts submitted for this quiz yet.
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  {quizAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/60"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            attempt.passed
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {attempt.passed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {attempt.student?.name || "Student"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(attempt.completed_at).toLocaleDateString()} at{" "}
                            {new Date(attempt.completed_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{attempt.percentage}%</span>
                          <Badge
                            className={
                              attempt.passed
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                            }
                          >
                            {attempt.passed ? "Passed" : "Retake"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {attempt.score} / {attempt.total_questions} correct
                        </p>
                      </div>
                    </div>
                  ))}
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
