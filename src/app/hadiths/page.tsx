"use client"

import {
  Award,
  BookOpen,
  Check,
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
        supabase.from("students").select("*").neq("status", "Left Uncompleted").order("name", { ascending: true }),
        supabase.from("hadith_assignments").select("*, hadiths(*)").order("assigned_at", { ascending: false }),
        supabase.from("student_hadith_progress").select("*"),
      ])

      const rawHadiths = (hadithsRes.data as any[]) || []
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
      setAssignments((assignRes.data as any[]) || [])
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

      return {
        student,
        memorizedCount,
        memorizingCount,
        milestone,
        activeAssignments: studentAssignments,
      }
    })
  }, [students, progressList, assignments])

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
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to assign Hadith")
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
        const nextHadithNumber = hadiths.length > 0 ? Math.max(...hadiths.map((h) => h.hadith_number)) + 1 : 1
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
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save Hadith")
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
    } catch (err: any) {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curriculum & Sunnah Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Short Hadiths Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse {hadiths.length} authentic short Hadiths for kids, assign weekly learning goals to your students, and monitor their memorization milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => openCustomModal()}
            variant="outline"
            className="gap-2 border-border/80 hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Hadith</span>
          </Button>
          <Button
            onClick={() => openAssignModal()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Send className="h-4 w-4" />
            <span>Assign Hadith</span>
          </Button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalHadiths}</p>
              <p className="text-xs text-muted-foreground">Hadiths in Library</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Active Students</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalMemorizations}</p>
              <p className="text-xs text-muted-foreground">Total Memorized</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.activeAssignments}</p>
              <p className="text-xs text-muted-foreground">Active Assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          onClick={() => setActiveTab("library")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
            activeTab === "library"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>Hadith Library ({hadiths.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
            activeTab === "students"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, Arabic words, English, Urdu, or moral lesson..."
                className="pl-9 bg-card"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                aria-label="Filter by Topic"
                className="h-10 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              const assignedCount = assignments.filter((a) => a.hadith_id === hadith.id && a.status === "pending").length
              const completedCount = progressList.filter((p) => p.hadith_id === hadith.id && p.status === "memorized").length

              return (
                <Card key={hadith.id} className="flex flex-col justify-between border-border/80 bg-card hover:border-emerald-500/30 transition-all shadow-sm">
                  <div>
                    <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {hadith.hadith_number}
                        </span>
                        <Badge variant="outline" className={cn("text-[11px] font-medium border", topicInfo.bgColor)}>
                          <span>{topicInfo.icon}</span>
                          <span className="ml-1">{topicInfo.label}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span title="Completed by students">✅ {completedCount}</span>
                        <span title="Currently assigned">🎯 {assignedCount}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {/* Arabic Text in Calligraphic Hadith Font */}
                      <div className="rounded-xl bg-secondary/30 p-4 border border-border/40 text-center">
                        <p className="font-hadith text-2xl sm:text-3xl text-foreground font-medium select-text" dir="rtl">
                          {hadith.arabic_text}
                        </p>
                      </div>

                      {/* English Translation */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase">Meaning</p>
                        <p className="text-sm font-medium text-foreground italic">&ldquo;{hadith.english_text}&rdquo;</p>
                      </div>

                      {/* Urdu Translation */}
                      <div className="text-right" dir="rtl">
                        <p className="text-[11px] font-semibold text-muted-foreground">ترجمہ</p>
                        <p className="text-sm font-medium text-foreground">{hadith.urdu_text}</p>
                      </div>

                      {/* Kid Lesson */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Kid&apos;s Lesson: </span>{hadith.kids_lesson}</p>
                      </div>

                      {/* Reference */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1">
                        <span>Narrator: {hadith.narrator}</span>
                        <span>{hadith.reference}</span>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions */}
                  <div className="p-3 bg-secondary/20 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
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
        <Card className="border-border/80">
          <CardHeader className="py-4 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground">Student Hadith Progress & Milestones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {studentRows.map(({ student, memorizedCount, memorizingCount, milestone, activeAssignments }) => (
                <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{student.name}</p>
                      <Badge variant="outline" className="text-[10px] bg-secondary border-border">
                        {student.status || "Reading"}
                      </Badge>
                      {activeAssignments.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                          {activeAssignments.length} active assignment{activeAssignments.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Target: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{milestone.badgeTitle}</span> ({memorizedCount} / {milestone.target} Hadiths)
                    </p>

                    {/* Progress Bar */}
                    <div className="w-48 h-2 rounded-full bg-secondary overflow-hidden border border-border/60 mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${milestone.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-bold text-foreground tabular-nums">✅ {memorizedCount} Memorized</p>
                      <p className="text-muted-foreground tabular-nums">🧠 {memorizingCount} Learning</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      onClick={() => openAssignModal(undefined, student.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Assign Hadith</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clean & Focused Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign Hadith to Students</DialogTitle>
            <DialogDescription>
              Select which students should learn and memorize this Hadith.
            </DialogDescription>
          </DialogHeader>

          {selectedHadithForAssign && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Hadith #{selectedHadithForAssign.hadith_number}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedHadithForAssign.reference}
                </span>
              </div>
              <p className="font-hadith text-base text-foreground" dir="rtl">
                {selectedHadithForAssign.arabic_text}
              </p>
              <p className="text-xs text-muted-foreground italic">
                &ldquo;{selectedHadithForAssign.english_text}&rdquo;
              </p>
            </div>
          )}

          <div className="space-y-3 py-1">
            {/* Search & Bulk Select Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="pl-8 h-8 text-xs bg-secondary/30"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTargetStudentIds(students.map((s) => s.id))}
                  className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-secondary/80 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStudentIds([])}
                  className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border/60 bg-card">
              {filteredModalStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No students found.
                </div>
              ) : (
                filteredModalStudents.map((student) => {
                  const isSelected = targetStudentIds.includes(student.id)
                  const isMemorized = progressList.some(
                    (p) => p.student_id === student.id && p.hadith_id === selectedHadithForAssign?.id && p.status === "memorized",
                  )

                  return (
                    <label
                      key={student.id}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer transition-colors select-none",
                        isSelected
                          ? "bg-emerald-500/10 text-foreground"
                          : "hover:bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md border transition-all",
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-input bg-card",
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-foreground">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground">{student.status || "Reading"}</p>
                        </div>
                      </div>

                      {isMemorized && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
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

            <p className="text-[11px] text-muted-foreground text-center">
              Selected: <span className="font-bold text-foreground">{targetStudentIds.length}</span> of {students.length} students
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={submittingAssign || targetStudentIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submittingAssign ? <Loader2 className="h-4 w-4 animate-spin" /> : `Assign to ${targetStudentIds.length} Student${targetStudentIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Hadith Modal */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingHadithId ? "Edit Hadith" : "Add Custom Short Hadith"}
            </DialogTitle>
            <DialogDescription>
              Add an authentic short Hadith (3-8 words) for children with full vowel marks (Tashkeel).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Arabic Text (with Tashkeel) *</Label>
              <Input
                value={customArabic}
                onChange={(e) => setCustomArabic(e.target.value)}
                placeholder="e.g. الطُّهُورُ شَطْرُ الإِيمَانِ"
                dir="rtl"
                className="text-base font-hadith"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">English Translation *</Label>
              <Input
                value={customEnglish}
                onChange={(e) => setCustomEnglish(e.target.value)}
                placeholder="e.g. Cleanliness is half of faith."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Urdu Translation</Label>
              <Input
                value={customUrdu}
                onChange={(e) => setCustomUrdu(e.target.value)}
                placeholder="e.g. صفائی اور پاکیزگی آدھا ایمان ہے۔"
                dir="rtl"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Kid&apos;s Daily Moral Lesson Takeaway *</Label>
              <Textarea
                value={customLesson}
                onChange={(e) => setCustomLesson(e.target.value)}
                placeholder="e.g. Wash your hands before eating and keep your room clean to make Allah happy!"
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Topic Category</Label>
                <Select value={customTopic} onValueChange={(val) => setCustomTopic(val as HadithTopic)}>
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
                <Label className="text-xs font-bold">Reference</Label>
                <Input
                  value={customReference}
                  onChange={(e) => setCustomReference(e.target.value)}
                  placeholder="e.g. Sahih Muslim 223"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Narrator</Label>
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
            <Button
              onClick={handleSaveCustomHadith}
              disabled={savingCustom}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {savingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Hadith"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
