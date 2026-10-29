"use client"

import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
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
import { getHadithNextMilestone, HADITH_TOPICS } from "@/lib/hadiths/hadith-engine"
import type {
  Hadith,
  HadithAssignment,
  HadithTopic,
  StudentHadithProgress,
} from "@/lib/hadiths/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import type { Student } from "@/lib/utils"
import { cn } from "@/lib/utils"

export default function TeacherHadithsPage() {
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<HadithAssignment[]>([])
  const [progressList, setProgressList] = useState<StudentHadithProgress[]>([])
  const [loading, setLoading] = useState(true)

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"library" | "students">("library")
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedHadithForAssign, setSelectedHadithForAssign] = useState<Hadith | null>(null)
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [submittingAssign, setSubmittingAssign] = useState(false)

  // Custom Hadith Modal
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [editingHadithId, setEditingHadithId] = useState<string | null>(null)
  const [customArabic, setCustomArabic] = useState("")
  const [customEnglish, setCustomEnglish] = useState("")
  const [customUrdu, setCustomUrdu] = useState("")
  const [customLesson, setCustomLesson] = useState("")
  const [customNarrator, setCustomNarrator] = useState("")
  const [customReference, setCustomReference] = useState("")
  const [customTopic, setCustomTopic] = useState<HadithTopic>("manners")
  const [savingCustom, setSavingCustom] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [hadithsRes, studentsRes, assignRes, progRes] = await Promise.all([
        supabase.from("hadiths").select("*").order("hadith_number", { ascending: true }),
        supabase
          .from("students")
          .select("*")
          .neq("status", "Left Uncompleted")
          .order("name", { ascending: true }),
        supabase
          .from("hadith_assignments")
          .select("*, hadiths(*)")
          .order("assigned_at", { ascending: false }),
        supabase.from("student_hadith_progress").select("*"),
      ])

      interface RawHadithRow {
        id: string
        hadith_number?: number
        arabic_text?: string
        english_text?: string
        english_translation?: string
        urdu_text?: string
        urdu_translation?: string
        kids_lesson?: string
        kid_lesson?: string
        narrator?: string
        reference?: string
        topic?: string
        order_index?: number
        is_published?: boolean
      }

      const rawHadiths = (hadithsRes.data as RawHadithRow[]) || []
      const formattedHadiths: Hadith[] = rawHadiths.map((h, index) => ({
        id: h.id,
        hadith_number: h.hadith_number || index + 1,
        arabic_text: h.arabic_text || "",
        english_text: h.english_text || h.english_translation || "",
        urdu_text: h.urdu_text || h.urdu_translation || "",
        kids_lesson: h.kids_lesson || h.kid_lesson || "",
        narrator: h.narrator || "Prophet Muhammad (ﷺ)",
        reference: h.reference || "",
        topic: (h.topic as HadithTopic) || "general",
        order_index: h.order_index || h.hadith_number || index + 1,
        is_published: h.is_published !== false,
      }))

      setHadiths(formattedHadiths)
      setStudents((studentsRes.data as Student[]) || [])
      setAssignments((assignRes.data as HadithAssignment[]) || [])
      setProgressList((progRes.data as StudentHadithProgress[]) || [])
    } catch (err) {
      console.error("Error loading Hadith studio data:", err)
      toast.error("Failed to load Hadith studio data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void loadData()
  }, [loadData])

  // Statistics
  const stats = useMemo(() => {
    const totalHadiths = hadiths.length
    const totalStudents = students.length
    const memorizedRows = progressList.filter((p) => p.status === "memorized")
    const totalMemorizations = memorizedRows.length
    const activeAssignments = assignments.filter((a) => a.status === "pending").length

    return {
      totalHadiths,
      totalStudents,
      totalMemorizations,
      activeAssignments,
    }
  }, [hadiths, students, progressList, assignments])

  // Filtered Hadiths Library
  const filteredHadiths = useMemo(() => {
    return hadiths.filter((h) => {
      if (selectedTopic !== "all" && h.topic !== selectedTopic) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchEng = (h.english_text || "").toLowerCase().includes(q)
        const matchUrdu = (h.urdu_text || "").includes(q)
        const matchArabic = (h.arabic_text || "").includes(q)
        const matchLesson = (h.kids_lesson || "").toLowerCase().includes(q)
        const matchRef = (h.reference || "").toLowerCase().includes(q)
        if (!matchEng && !matchUrdu && !matchArabic && !matchLesson && !matchRef) {
          return false
        }
      }
      return true
    })
  }, [hadiths, selectedTopic, searchQuery])

  // State for student progress accordion & marking memorized
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [markingMemorizedId, setMarkingMemorizedId] = useState<string | null>(null)

  // Teacher marks a Hadith as memorized for a student
  const handleTeacherMarkMemorized = async (
    studentId: string,
    hadithId: string,
    studentName: string,
  ) => {
    setMarkingMemorizedId(`${studentId}-${hadithId}`)
    try {
      const res = await fetch("/api/hadiths/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          hadith_id: hadithId,
          status: "memorized",
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.newlyAwardedBadges && data.newlyAwardedBadges.length > 0) {
          toast.success(
            `Masha'Allah! Marked as memorized for ${studentName}. Badges awarded: ${data.newlyAwardedBadges.join(", ")}!`,
          )
        } else {
          toast.success(`Hadith marked as memorized for ${studentName}.`)
        }
        await loadData()
      } else {
        toast.error(data.error || "Failed to update memorization status")
      }
    } catch (err) {
      console.error("Error marking memorized:", err)
      toast.error("Failed to mark as memorized")
    } finally {
      setMarkingMemorizedId(null)
    }
  }

  // Map student progress data for the Students Tracker Tab
  const studentRows = useMemo(() => {
    return students.map((student) => {
      const studentProgress = progressList.filter((p) => p.student_id === student.id)
      const memorizedCount = studentProgress.filter((p) => p.status === "memorized").length
      const memorizingCount = studentProgress.filter((p) => p.status === "memorizing").length
      const milestone = getHadithNextMilestone(memorizedCount)

      // Active assignments for this student
      const studentAssignments = assignments.filter(
        (a) => a.student_id === student.id && a.status === "pending",
      )

      // Memorized Hadiths list with full Hadith info
      const memorizedList = studentProgress
        .filter((p) => p.status === "memorized")
        .map((p) => {
          const hadith = hadiths.find((h) => h.id === p.hadith_id)
          return {
            ...p,
            hadith,
          }
        })
        .filter((p) => Boolean(p.hadith))

      return {
        student,
        memorizedCount,
        memorizingCount,
        milestone,
        activeAssignments: studentAssignments,
        memorizedList,
      }
    })
  }, [students, progressList, assignments, hadiths])

  // Open Assign Modal
  const openAssignModal = (hadith?: Hadith, specificStudentId?: string) => {
    const targetHadith = hadith || hadiths[0] || null
    setSelectedHadithForAssign(targetHadith)
    setStudentSearch("")

    if (specificStudentId) {
      setTargetStudentIds([specificStudentId])
    } else if (targetHadith) {
      // Pre-select students currently assigned to this hadith
      const currentlyAssigned = assignments
        .filter((a) => a.hadith_id === targetHadith.id && a.status === "pending")
        .map((a) => a.student_id)
      setTargetStudentIds(currentlyAssigned)
    } else {
      setTargetStudentIds([])
    }

    setAssignModalOpen(true)
  }

  // Handle Submit Assignment
  const handleAssignSubmit = async () => {
    if (!selectedHadithForAssign) {
      toast.error("Please select a Hadith")
      return
    }

    setSubmittingAssign(true)
    try {
      const res = await fetch("/api/hadiths/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hadith_id: selectedHadithForAssign.id,
          student_ids: targetStudentIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign Hadith")
      }

      toast.success(
        `Assigned Hadith #${selectedHadithForAssign.hadith_number} to ${targetStudentIds.length} student${targetStudentIds.length === 1 ? "" : "s"}`,
      )
      setAssignModalOpen(false)
      void loadData()
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to assign Hadith")
    } finally {
      setSubmittingAssign(false)
    }
  }

  // Filtered student list for assign modal
  const filteredModalStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const q = studentSearch.toLowerCase()
    return students.filter((s) => s.name.toLowerCase().includes(q))
  }, [students, studentSearch])

  // Open Add/Edit Custom Hadith Modal
  const openCustomModal = (hadith?: Hadith) => {
    if (hadith) {
      setEditingHadithId(hadith.id)
      setCustomArabic(hadith.arabic_text)
      setCustomEnglish(hadith.english_text)
      setCustomUrdu(hadith.urdu_text)
      setCustomLesson(hadith.kids_lesson)
      setCustomNarrator(hadith.narrator || "Prophet Muhammad (ﷺ)")
      setCustomReference(hadith.reference)
      setCustomTopic(hadith.topic)
    } else {
      setEditingHadithId(null)
      setCustomArabic("")
      setCustomEnglish("")
      setCustomUrdu("")
      setCustomLesson("")
      setCustomNarrator("Prophet Muhammad (ﷺ)")
      setCustomReference("Sahih al-Bukhari")
      setCustomTopic("manners")
    }
    setCustomModalOpen(true)
  }

  // Handle Save Custom Hadith
  const handleSaveCustomHadith = async () => {
    if (!customArabic.trim() || !customEnglish.trim()) {
      toast.error("Arabic text and English translation are required")
      return
    }

    setSavingCustom(true)
    try {
      if (editingHadithId) {
        const { error } = await supabase
          .from("hadiths")
          .update({
            arabic_text: customArabic.trim(),
            english_text: customEnglish.trim(),
            urdu_text: customUrdu.trim(),
            kids_lesson: customLesson.trim(),
            narrator: customNarrator.trim() || "Prophet Muhammad (ﷺ)",
            reference: customReference.trim() || "Sahih al-Bukhari",
            topic: customTopic,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingHadithId)

        if (error) throw error
        toast.success("Hadith updated successfully")
      } else {
        const nextHadithNumber =
          hadiths.length > 0 ? Math.max(...hadiths.map((h) => h.hadith_number)) + 1 : 1
        const { error } = await supabase.from("hadiths").insert({
          hadith_number: nextHadithNumber,
          arabic_text: customArabic.trim(),
          english_text: customEnglish.trim(),
          urdu_text: customUrdu.trim(),
          kids_lesson: customLesson.trim(),
          narrator: customNarrator.trim() || "Prophet Muhammad (ﷺ)",
          reference: customReference.trim() || "Sahih al-Bukhari",
          topic: customTopic,
          order_index: nextHadithNumber,
          is_published: true,
        })

        if (error) throw error
        toast.success("New Hadith added to library")
      }

      setCustomModalOpen(false)
      void loadData()
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to save Hadith")
    } finally {
      setSavingCustom(false)
    }
  }

  // Delete Custom Hadith
  const handleDeleteHadith = async (hadithId: string) => {
    if (!confirm("Are you sure you want to remove this Hadith from the library?")) return
    try {
      const { error } = await supabase.from("hadiths").delete().eq("id", hadithId)
      if (error) throw error
      toast.success("Hadith removed")
      void loadData()
    } catch (err: unknown) {
      console.error(err)
      toast.error("Failed to delete Hadith")
    }
  }

  if (loading) {
    return <PageLoading variant="grid-cards" />
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curriculum & Sunnah Studio</span>
          </div>
          <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
            Hadiths Studio
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Browse {hadiths.length} authentic Hadiths, assign weekly learning goals to your
            students, and monitor their memorization milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => openCustomModal()} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Custom Hadith</span>
          </Button>
          <Button onClick={() => openAssignModal()} className="gap-2">
            <Send className="h-4 w-4" />
            <span>Assign Hadith</span>
          </Button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(87,80,241,0.10)] text-[#5750F1]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 mt-6 text-2xl font-semibold leading-8 tabular-nums text-text-primary">
                {stats.totalHadiths}
              </p>
              <p className="text-sm font-medium text-text-tertiary">Hadiths in Library</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.10)] text-[#3B82F6]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 mt-6 text-2xl font-semibold leading-8 tabular-nums text-text-primary">
                {stats.totalStudents}
              </p>
              <p className="text-sm font-medium text-text-tertiary">Active Students</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22C55E]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 mt-6 text-2xl font-semibold leading-8 tabular-nums text-text-primary">
                {stats.totalMemorizations}
              </p>
              <p className="text-sm font-medium text-text-tertiary">Total Memorized</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 mt-6 text-2xl font-semibold leading-8 tabular-nums text-text-primary">
                {stats.activeAssignments}
              </p>
              <p className="text-sm font-medium text-text-tertiary">Active Assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-background-gray-secondary p-1">
        <button
          onClick={() => setActiveTab("library")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "library"
              ? "bg-card-background text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>Hadith Library ({hadiths.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "students"
              ? "bg-card-background text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Student Progress ({students.length})</span>
        </button>
      </div>

      {/* 4. Tab 1: Hadith Library */}
      {activeTab === "library" && (
        <div className="space-y-4">
          {/* Search & Topic Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-tertiary" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, Arabic words, English, Urdu, or moral lesson..."
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                aria-label="Filter by Topic"
                className="h-10 rounded-lg border border-card-border bg-card-background px-3 text-xs font-medium text-text-primary shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Topics ({hadiths.length})</option>
                {Object.entries(HADITH_TOPICS).map(([key, topic]) => (
                  <option key={key} value={key}>
                    {topic.icon} {topic.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hadith Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHadiths.map((hadith) => {
              const topicInfo = HADITH_TOPICS[hadith.topic] || HADITH_TOPICS.general
              const assignedCount = assignments.filter(
                (a) => a.hadith_id === hadith.id && a.status === "pending",
              ).length
              const completedCount = progressList.filter(
                (p) => p.hadith_id === hadith.id && p.status === "memorized",
              ).length

              return (
                <Card key={hadith.id} className="flex flex-col justify-between">
                  <div>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border-primary px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background-gray-secondary text-xs font-semibold text-text-primary">
                          {hadith.hadith_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-medium border", topicInfo.bgColor)}
                        >
                          <span>{topicInfo.icon}</span>
                          <span className="ml-1">{topicInfo.label}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span title="Completed by students">✅ {completedCount}</span>
                        <span title="Currently assigned">🎯 {assignedCount}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 p-4">
                      {/* Arabic Text in Calligraphic Hadith Font */}
                      <div className="rounded-lg bg-background-gray-primary p-4 text-center">
                        <p
                          className="font-hadith text-2xl sm:text-3xl text-foreground font-medium select-text"
                          dir="rtl"
                        >
                          {hadith.arabic_text}
                        </p>
                      </div>

                      {/* English Translation */}
                      <div>
                        <p className="text-xs font-medium uppercase text-text-tertiary">Meaning</p>
                        <p className="text-sm italic text-text-primary">
                          &ldquo;{hadith.english_text}&rdquo;
                        </p>
                      </div>

                      {/* Urdu Translation */}
                      <div className="text-right" dir="rtl">
                        <p className="text-[11px] font-semibold text-muted-foreground">ترجمہ</p>
                        <p className="text-sm font-medium text-foreground">{hadith.urdu_text}</p>
                      </div>

                      {/* Kid Lesson */}
                      <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-2.5">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <p className="text-xs text-text-secondary">
                          <span className="font-medium text-text-primary">Kid&apos;s Lesson: </span>
                          {hadith.kids_lesson}
                        </p>
                      </div>

                      {/* Reference */}
                      <div className="flex items-center justify-between pt-1 text-xs text-text-tertiary">
                        <span>Narrator: {hadith.narrator}</span>
                        <span>{hadith.reference}</span>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-border-primary p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-text-secondary hover:text-text-primary"
                        onClick={() => openCustomModal(hadith)}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteHadith(hadith.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => openAssignModal(hadith)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Assign to Students</span>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Students Progress Tracker */}
      {activeTab === "students" && (
        <Card>
          <CardHeader className="border-b border-border-primary py-4">
            <CardTitle className="text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              Student Hadith Progress & Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-primary">
              {studentRows.map(
                ({ student, memorizedCount, milestone, activeAssignments, memorizedList }) => {
                  const isExpanded = expandedStudentId === student.id

                  return (
                    <div key={student.id} className="transition-colors">
                      <div className="flex flex-col justify-between gap-4 p-4 hover:bg-background-gray-primary sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{student.name}</p>
                            <Badge
                              variant="outline"
                              className="border-0 bg-background-gray-secondary text-[11px] text-text-secondary"
                            >
                              {student.status || "Reading"}
                            </Badge>
                            {activeAssignments.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/15 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                              >
                                {activeAssignments.length} active assignment
                                {activeAssignments.length === 1 ? "" : "s"}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-text-tertiary">
                            Target:{" "}
                            <span className="font-medium text-primary">{milestone.badgeTitle}</span>{" "}
                            ({memorizedCount} / {milestone.target} Hadiths)
                          </p>

                          {/* Progress Bar */}
                          <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-background-gray-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${milestone.percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="mr-1 text-right text-xs">
                            <p className="font-semibold tabular-nums text-text-primary">
                              ✅ {memorizedCount} Memorized
                            </p>
                            <p className="tabular-nums text-text-tertiary">
                              🎯 {activeAssignments.length} Assigned
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => openAssignModal(undefined, student.id)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Assign</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs text-text-secondary hover:text-text-primary"
                            onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                          >
                            <span>{isExpanded ? "Hide Details" : "Manage"}</span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Details Section for Teacher */}
                      {isExpanded && (
                        <div className="space-y-4 border-t border-border-primary bg-background-gray-primary p-4 animate-in fade-in-50 duration-150">
                          {/* 1. Active Assignments */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-text-tertiary">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Active
                                Assignments ({activeAssignments.length})
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={() => openAssignModal(undefined, student.id)}
                              >
                                <Plus className="h-3 w-3" /> Assign Another
                              </Button>
                            </div>

                            {activeAssignments.length === 0 ? (
                              <p className="rounded-lg border border-card-border bg-card-background p-3 text-xs italic text-text-tertiary">
                                No active Hadith assignments for {student.name}. Click
                                &ldquo;Assign&rdquo; above to assign one.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeAssignments.map((a) => {
                                  const h = a.hadiths
                                  if (!h) return null
                                  const isMarking = markingMemorizedId === `${student.id}-${h.id}`

                                  return (
                                    <div
                                      key={a.id}
                                      className="space-y-2.5 rounded-lg border border-card-border bg-card-background p-3.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-text-primary">
                                          Hadith #{h.hadith_number}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300"
                                        >
                                          Pending Memorization
                                        </Badge>
                                      </div>

                                      <p className="font-hadith text-lg text-foreground" dir="rtl">
                                        {h.arabic_text}
                                      </p>

                                      <p className="line-clamp-2 text-xs italic text-text-tertiary">
                                        &ldquo;{h.english_text}&rdquo;
                                      </p>

                                      <div className="flex items-center justify-between border-t border-border-primary pt-2">
                                        <span className="text-[11px] text-text-tertiary">
                                          {h.reference}
                                        </span>
                                        <Button
                                          size="sm"
                                          disabled={isMarking}
                                          onClick={() =>
                                            handleTeacherMarkMemorized(
                                              student.id,
                                              h.id,
                                              student.name,
                                            )
                                          }
                                          className="h-7 gap-1 text-xs bg-green-600 text-white hover:bg-green-700"
                                        >
                                          {isMarking ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          )}
                                          <span>Mark as Memorized</span>
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* 2. Memorized Hadiths */}
                          {memorizedList.length > 0 && (
                            <div className="space-y-2 border-t border-border-primary pt-2">
                              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-text-tertiary">
                                <Award className="h-3.5 w-3.5 text-green-600" /> Memorized Hadiths (
                                {memorizedList.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {memorizedList.map((m) => (
                                  <div
                                    key={m.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-text-primary"
                                  >
                                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                      Hadith #{m.hadith?.hadith_number}
                                    </span>
                                    <span className="max-w-[12rem] truncate text-[11px] text-text-tertiary">
                                      {m.hadith?.english_text?.slice(0, 35)}...
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                },
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clean & Focused Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Assign Hadith to Students</DialogTitle>
            <DialogDescription>
              Select which students should learn and memorize this Hadith.
            </DialogDescription>
          </DialogHeader>

          {selectedHadithForAssign && (
            <div className="space-y-1 rounded-lg bg-primary/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  Hadith #{selectedHadithForAssign.hadith_number}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {selectedHadithForAssign.reference}
                </span>
              </div>
              <p className="font-hadith text-base text-foreground" dir="rtl">
                {selectedHadithForAssign.arabic_text}
              </p>
              <p className="text-xs italic text-text-tertiary">
                &ldquo;{selectedHadithForAssign.english_text}&rdquo;
              </p>
            </div>
          )}

          <div className="space-y-3 py-1">
            {/* Search & Bulk Select Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-icon-tertiary" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTargetStudentIds(students.map((s) => s.id))}
                  className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStudentIds([])}
                  className="rounded-md bg-background-gray-secondary px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="max-h-60 divide-y divide-border-primary overflow-y-auto rounded-lg border border-card-border bg-card-background">
              {filteredModalStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-tertiary">No students found.</div>
              ) : (
                filteredModalStudents.map((student) => {
                  const isSelected = targetStudentIds.includes(student.id)
                  const isMemorized = progressList.some(
                    (p) =>
                      p.student_id === student.id &&
                      p.hadith_id === selectedHadithForAssign?.id &&
                      p.status === "memorized",
                  )

                  return (
                    <label
                      key={student.id}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer transition-colors select-none",
                        isSelected
                          ? "bg-primary/10 text-text-primary"
                          : "text-text-secondary hover:bg-background-gray-primary",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-card-border bg-card-background",
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>

                        <div>
                          <p className="text-xs font-medium text-text-primary">{student.name}</p>
                          <p className="text-[11px] text-text-tertiary">
                            {student.status || "Reading"}
                          </p>
                        </div>
                      </div>

                      {isMemorized && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-[11px] font-medium text-green-700 dark:text-green-400"
                        >
                          Already Memorized
                        </Badge>
                      )}

                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetStudentIds((prev) => [...prev, student.id])
                          } else {
                            setTargetStudentIds((prev) => prev.filter((id) => id !== student.id))
                          }
                        }}
                        className="sr-only"
                      />
                    </label>
                  )
                })
              )}
            </div>

            <p className="text-center text-[11px] text-text-tertiary">
              Selected:{" "}
              <span className="font-semibold text-text-primary">{targetStudentIds.length}</span> of{" "}
              {students.length} students
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={submittingAssign || targetStudentIds.length === 0}
            >
              {submittingAssign ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Assign to ${targetStudentIds.length} Student${targetStudentIds.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Hadith Modal */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingHadithId ? "Edit Hadith" : "Add Custom Hadith"}
            </DialogTitle>
            <DialogDescription>
              Add an authentic Hadith with full vowel marks (Tashkeel).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Arabic Text (with Tashkeel) *</Label>
              <Input
                value={customArabic}
                onChange={(e) => setCustomArabic(e.target.value)}
                placeholder="e.g. الطُّهُورُ شَطْرُ الإِيمَانِ"
                dir="rtl"
                className="text-base font-hadith"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">English Translation *</Label>
              <Input
                value={customEnglish}
                onChange={(e) => setCustomEnglish(e.target.value)}
                placeholder="e.g. Cleanliness is half of faith."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Urdu Translation</Label>
              <Input
                value={customUrdu}
                onChange={(e) => setCustomUrdu(e.target.value)}
                placeholder="e.g. صفائی اور پاکیزگی آدھا ایمان ہے۔"
                dir="rtl"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Kid&apos;s Daily Moral Lesson Takeaway *
              </Label>
              <Textarea
                value={customLesson}
                onChange={(e) => setCustomLesson(e.target.value)}
                placeholder="e.g. Wash your hands before eating and keep your room clean to make Allah happy!"
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Topic Category</Label>
                <Select
                  value={customTopic}
                  onValueChange={(val) => setCustomTopic(val as HadithTopic)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HADITH_TOPICS).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {info.icon} {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Reference</Label>
                <Input
                  value={customReference}
                  onChange={(e) => setCustomReference(e.target.value)}
                  placeholder="e.g. Sahih Muslim 223"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Narrator</Label>
              <Input
                value={customNarrator}
                onChange={(e) => setCustomNarrator(e.target.value)}
                placeholder="e.g. Abu Malik al-Ash'ari (RA)"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomHadith} disabled={savingCustom}>
              {savingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Hadith"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
