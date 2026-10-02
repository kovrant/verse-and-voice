"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns aren't worth it for this internal admin tool */

import * as Popover from "@radix-ui/react-popover"
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { PageLoading } from "@/components/page-loading"
import { QuranGemBox } from "@/components/quran-gem-box"
import { StoryMoralCompass } from "@/components/story-moral-compass"
import { StoryReflectionPledge } from "@/components/story-reflection-pledge"
import { StorySceneReader } from "@/components/story-scene-reader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { getHijriMonthInfo, HIJRI_MONTHS } from "@/lib/hijri"
import {
  CATEGORIES,
  CATEGORY_ICON,
  CURATED_ISLAMIC_TOPICS,
  type CuratedTopic,
  getCanvaDreamLabPrompt,
  type HistoryStory,
  type LifeLesson,
  normalizeTopicSlug,
  type QuranGem,
} from "@/lib/history"
import {
  downscaleImageFile,
  type DownscaleImageResult,
  formatFileSize,
  safeUploadExtension,
} from "@/lib/media-upload"
import { CACHE_FOREVER } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"

type FormState = {
  title: string
  arabic_title: string
  subtitle: string
  summary: string
  content: string
  category: string
  target_age_group: "5-8" | "9-12" | "13-16" | "all"
  hero_virtue: string
  reading_time_mins: number
  reflection_challenge: string
  cover_prompt: string
  hijri_month: string // "" = none, else "1".."12"
  is_published: boolean
  quran_gem: QuranGem | null
  life_lessons: LifeLesson[] | null
  quiz_id: string | null
}

const EMPTY_FORM: FormState = {
  title: "",
  arabic_title: "",
  subtitle: "",
  summary: "",
  content: "",
  category: "Prophets",
  target_age_group: "9-12",
  hero_virtue: "",
  reading_time_mins: 4,
  reflection_challenge: "",
  cover_prompt: "",
  hijri_month: "",
  is_published: false, // Default to draft
  quran_gem: null,
  life_lessons: null,
  quiz_id: null,
}

export default function HistoryAdminPage() {
  const [stories, setStories] = useState<HistoryStory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")

  // Editor dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<HistoryStory | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // AI Generator modal state
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiAgeGroup, setAiAgeGroup] = useState<"5-8" | "9-12" | "13-16" | "all">("9-12")
  const [aiCategory, setAiCategory] = useState("Prophets")
  const [aiHijriMonth, setAiHijriMonth] = useState("")
  const [aiInstructions, setAiInstructions] = useState("")
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiDuplicateAlert, setAiDuplicateAlert] = useState<{
    message: string
    suggestions: CuratedTopic[]
  } | null>(null)

  // File state (in the editor)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCover, setExistingCover] = useState<string | null>(null)
  const [coverOptimization, setCoverOptimization] = useState<DownscaleImageResult | null>(null)
  const [optimizingImage, setOptimizingImage] = useState(false)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [existingAttach, setExistingAttach] = useState<{ url: string; type: string } | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<HistoryStory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null)
  const [copiedEditorPrompt, setCopiedEditorPrompt] = useState(false)
  const [readingStory, setReadingStory] = useState<HistoryStory | null>(null)

  useEffect(() => {
    loadStories()
  }, [])

  // Manage cover preview blob lifecycle.
  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile)
      setCoverPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setCoverPreview(null)
  }, [coverFile])

  async function loadStories() {
    const { data, error } = await supabase
      .from("islamic_history")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
    if (error) {
      toast.error(error.message)
    }
    setStories((data as HistoryStory[]) || [])
    setLoading(false)
  }

  async function handleCoverSelect(file: File) {
    if (!file) return
    setOptimizingImage(true)
    try {
      if (file.type.startsWith("image/")) {
        const result = await downscaleImageFile(file, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
          targetMimeType: "image/webp",
        })
        setCoverFile(result.file)
        setCoverOptimization(result)
        if (result.savingsPercent > 0) {
          toast.success(
            `Cover optimized: ${formatFileSize(result.originalSize)} ➜ ${formatFileSize(result.optimizedSize)} (${result.savingsPercent}% saved, ${result.width}×${result.height})`,
          )
        }
      } else {
        setCoverFile(file)
        setCoverOptimization(null)
      }
    } catch (err) {
      console.error("Image downscaling failed:", err)
      setCoverFile(file)
      setCoverOptimization(null)
    } finally {
      setOptimizingImage(false)
    }
  }

  async function uploadFile(
    file: File,
    folder: "covers" | "documents" = "covers",
  ): Promise<string | null> {
    let fileToUpload = file
    if (folder === "covers" && file.type.startsWith("image/") && !coverOptimization) {
      try {
        const res = await downscaleImageFile(file, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
          targetMimeType: "image/webp",
        })
        fileToUpload = res.file
      } catch {
        // Fallback to original file
      }
    }

    // 1. Preferred: Call dedicated server upload route (bypasses RLS, creates bucket, handles folders)
    try {
      const fd = new FormData()
      fd.append("file", fileToUpload)
      fd.append("folder", folder)
      const res = await fetch("/api/history/upload", {
        method: "POST",
        body: fd,
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) return data.url
      } else {
        const err = await res.json().catch(() => null)
        console.warn("Server upload warning, attempting client fallback:", err)
      }
    } catch (apiErr) {
      console.warn("Server upload route call error, falling back to direct client upload:", apiErr)
    }

    // 2. Direct client fallback with organized folder prefix
    const fallbackExt = fileToUpload.type.startsWith("image/") ? "webp" : "pdf"
    const ext = safeUploadExtension(fileToUpload.name, fallbackExt)
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // 2a. Try primary bucket
    const { error: primaryErr } = await supabase.storage
      .from("history-attachments")
      .upload(path, fileToUpload, {
        cacheControl: CACHE_FOREVER,
        upsert: false,
      })

    if (!primaryErr) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("history-attachments").getPublicUrl(path)
      return publicUrl
    }

    // 2b. Fallback to media bucket
    const mediaPath = `history/${path}`
    const { error: mediaErr } = await supabase.storage
      .from("media")
      .upload(mediaPath, fileToUpload, {
        cacheControl: CACHE_FOREVER,
        upsert: false,
      })

    if (!mediaErr) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(mediaPath)
      return publicUrl
    }

    toast.error(`Upload error: ${primaryErr.message || mediaErr?.message}`)
    return null
  }

  function fileTypeFor(file: File): string {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (ext === "pdf") return "pdf"
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image"
    return "doc"
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    setExistingCover(null)
    setCoverOptimization(null)
    setAttachFile(null)
    setExistingAttach(null)
    setEditorOpen(true)
  }

  function openEdit(story: HistoryStory) {
    setEditing(story)
    setForm({
      title: story.title,
      arabic_title: story.arabic_title ?? "",
      subtitle: story.subtitle ?? "",
      summary: story.summary ?? "",
      content: story.content ?? "",
      category: story.category,
      target_age_group: story.target_age_group ?? "9-12",
      hero_virtue: story.hero_virtue ?? "",
      reading_time_mins: story.reading_time_mins ?? 4,
      reflection_challenge: story.reflection_challenge ?? "",
      cover_prompt: story.cover_prompt || getCanvaDreamLabPrompt(story),
      hijri_month: story.hijri_month ? String(story.hijri_month) : "",
      is_published: story.is_published,
      quran_gem: story.quran_gem ?? null,
      life_lessons: story.life_lessons ?? null,
      quiz_id: story.quiz_id ?? null,
    })
    setCoverFile(null)
    setExistingCover(story.cover_image_url)
    setCoverOptimization(null)
    setAttachFile(null)
    setExistingAttach(
      story.file_url ? { url: story.file_url, type: story.file_type ?? "doc" } : null,
    )
    setEditorOpen(true)
  }

  async function togglePublish(story: HistoryStory) {
    const newStatus = !story.is_published
    const { error } = await supabase
      .from("islamic_history")
      .update({ is_published: newStatus })
      .eq("id", story.id)

    if (error) {
      toast.error(error.message)
      return
    }

    if (story.quiz_id) {
      await supabase.from("quizzes").update({ is_published: newStatus }).eq("id", story.quiz_id)
    }

    toast.success(newStatus ? `"${story.title}" published!` : `"${story.title}" moved to drafts.`)
    await loadStories()
  }

  async function saveStory() {
    if (!form.title.trim()) {
      toast.error("A title is required.")
      return
    }
    setSaving(true)

    // Upload files if new ones were picked.
    let coverUrl = existingCover
    if (coverFile) {
      const url = await uploadFile(coverFile, "covers")
      if (!url) {
        toast.error("Cover image upload failed.")
        setSaving(false)
        return
      }
      coverUrl = url
    }

    let attachUrl = existingAttach?.url ?? null
    let attachType = existingAttach?.type ?? null
    if (attachFile) {
      const url = await uploadFile(attachFile, "documents")
      if (!url) {
        toast.error("Attachment upload failed.")
        setSaving(false)
        return
      }
      attachUrl = url
      attachType = fileTypeFor(attachFile)
    }

    const payload = {
      title: form.title.trim(),
      arabic_title: form.arabic_title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      topic_slug: normalizeTopicSlug(form.title),
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      category: form.category,
      target_age_group: form.target_age_group,
      hero_virtue: form.hero_virtue.trim() || null,
      reading_time_mins: Number(form.reading_time_mins) || 4,
      reflection_challenge: form.reflection_challenge.trim() || null,
      cover_prompt: form.cover_prompt.trim() || getCanvaDreamLabPrompt(form),
      hijri_month: form.hijri_month ? Number(form.hijri_month) : null,
      cover_image_url: coverUrl,
      file_url: attachUrl,
      file_type: attachUrl ? attachType : null,
      is_published: form.is_published,
    }

    let error
    if (editing) {
      ;({ error } = await supabase.from("islamic_history").update(payload).eq("id", editing.id))
    } else {
      ;({ error } = await supabase.from("islamic_history").insert(payload))
    }

    if (error && (error.code === "42703" || error.message?.includes("does not exist"))) {
      // Fallback for unapplied migration: save baseline columns
      const basePayload = {
        title: form.title.trim(),
        arabic_title: form.arabic_title.trim() || null,
        summary: form.summary.trim() || null,
        content: form.content.trim() || null,
        category: form.category,
        hijri_month: form.hijri_month ? Number(form.hijri_month) : null,
        cover_image_url: coverUrl,
        file_url: attachUrl,
        file_type: attachUrl ? attachType : null,
        is_published: form.is_published,
      }
      ;({ error } = editing
        ? await supabase.from("islamic_history").update(basePayload).eq("id", editing.id)
        : await supabase.from("islamic_history").insert(basePayload))
    }

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    if (form.quiz_id) {
      await supabase.from("quizzes").update({ is_published: form.is_published }).eq("id", form.quiz_id)
    }

    setSaving(false)
    setEditorOpen(false)
    await loadStories()
    toast.success(editing ? "Story updated" : `"${payload.title}" created!`)
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const { error } = await supabase.from("islamic_history").delete().eq("id", toDelete.id)
    if (error) {
      toast.error(error.message)
      setDeleting(false)
      return
    }
    const title = toDelete.title
    setToDelete(null)
    setDeleting(false)
    await loadStories()
    toast.success(`"${title}" deleted`)
  }

  // Handle AI Story Generation
  async function handleGenerateAi() {
    if (!aiTopic.trim()) {
      toast.error("Please enter or select a topic.")
      return
    }

    setGeneratingAi(true)
    setAiDuplicateAlert(null)

    try {
      const res = await fetch("/api/history/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          target_age_group: aiAgeGroup,
          category: aiCategory,
          hijri_month: aiHijriMonth ? Number(aiHijriMonth) : null,
          custom_instructions: aiInstructions.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        // Duplicate topic detected!
        setAiDuplicateAlert({
          message: data.error || "This story already exists.",
          suggestions: data.suggestions || [],
        })
        setGeneratingAi(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate story")
      }

      toast.success(`Story "${data.story.title}" drafted with linked quiz!`)
      setAiModalOpen(false)
      setAiTopic("")
      setAiInstructions("")
      await loadStories()

      // Automatically open the generated story in editor for review
      if (data.story) {
        openEdit(data.story as HistoryStory)
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error generating story"
      toast.error(errorMsg)
    } finally {
      setGeneratingAi(false)
    }
  }

  // Unwritten curated topics for quick topic chips
  const writtenSlugs = new Set(stories.map((s) => s.topic_slug).filter(Boolean))
  const unwrittenCuratedTopics = CURATED_ISLAMIC_TOPICS.filter(
    (c) => !writtenSlugs.has(c.topic_slug),
  )

  const filtered = stories.filter((s) => {
    const matchesCat = filterCat === "All" || s.category === filterCat
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.hero_virtue ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) return <PageLoading variant="grid-cards" count={6} />

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Islamic History & Stories
          </h1>
          <p className="text-muted-foreground mt-1">
            Authentic storybooks and derived quizzes for kids. {stories.length}{" "}
            {stories.length === 1 ? "story" : "stories"} on shelf.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setAiDuplicateAlert(null)
              setAiModalOpen(true)
            }}
            className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            Draft Story with AI
          </Button>

          <Button onClick={openCreate} variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Manual Story
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories, virtues, prophets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="flex flex-wrap items-center rounded-xl border border-border/50 bg-card p-1 gap-1">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCat === c
                  ? "bg-emerald-500/10 text-emerald-500 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <ScrollText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No stories found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Draft your first Islamic history storybook with AI or manual input.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => setAiModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
              >
                <Sparkles className="h-4 w-4" />
                Draft with AI
              </Button>
              <Button onClick={openCreate} variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Story
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story) => {
            const monthInfo = getHijriMonthInfo(story.hijri_month)
            return (
              <div
                key={story.id}
                className="group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-border hover:shadow-soft transition-all"
              >
                {/* Cover Banner */}
                {story.cover_image_url ? (
                  <button
                    type="button"
                    onClick={() => setReadingStory(story)}
                    className="w-full aspect-[16/9] overflow-hidden bg-secondary text-left relative group/img cursor-pointer"
                  >
                    <img
                      src={story.cover_image_url}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-black shadow-md">
                        <BookOpen className="h-3.5 w-3.5 text-teal-600" /> Read Story
                      </span>
                    </div>
                  </button>
                ) : (
                  <div
                    onClick={() => setReadingStory(story)}
                    className="w-full aspect-[16/9] flex flex-col items-center justify-center bg-secondary/60 gap-1.5 p-3 cursor-pointer group/icon"
                  >
                    <span className="text-3xl group-hover/icon:scale-110 transition-transform">
                      {CATEGORY_ICON[story.category] ?? "📜"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const prompt = story.cover_prompt || getCanvaDreamLabPrompt(story)
                        navigator.clipboard.writeText(prompt)
                        setCopiedPromptId(story.id)
                        toast.success("Copied Canva Dream Lab prompt! Generate in Canva & upload.")
                        setTimeout(() => setCopiedPromptId(null), 3000)
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-card/95 px-2.5 py-1 text-[10.5px] font-bold text-purple-700 dark:text-purple-300 shadow-sm hover:bg-purple-500/15 transition-all"
                      title="Copy AI image prompt for Canva Dream Lab"
                    >
                      {copiedPromptId === story.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>Copied Prompt!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span>Canva AI Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <Badge
                    variant={story.is_published ? "default" : "warning"}
                    className="text-[10px] py-0 font-bold"
                  >
                    {story.is_published ? "Published" : "Draft"}
                  </Badge>
                  {story.quiz_id && (
                    <Link
                      href={`/quizzes/${story.quiz_id}`}
                      target="_blank"
                      className="inline-flex items-center"
                      title="View linked quiz"
                    >
                      <Badge variant="outline" className="text-[10px] py-0 bg-card/90 text-amber-600 hover:border-amber-500/60 cursor-pointer">
                        <Trophy className="h-3 w-3 mr-1" /> Quiz
                      </Badge>
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => togglePublish(story)}
                    className={`flex h-7 px-2 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm backdrop-blur-sm ${
                      story.is_published
                        ? "bg-amber-600/90 hover:bg-amber-700"
                        : "bg-emerald-600/90 hover:bg-emerald-700"
                    }`}
                    title={story.is_published ? "Unpublish" : "Publish"}
                  >
                    {story.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(story)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <Popover.Root
                    open={toDelete?.id === story.id}
                    onOpenChange={(open) => setToDelete(open ? story : null)}
                  >
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-destructive hover:bg-black/80 backdrop-blur-sm"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        side="top"
                        align="end"
                        sideOffset={8}
                        className="z-50 rounded-xl border border-white/[0.08] bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/50 w-56 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                      >
                        <p className="text-xs text-foreground font-medium mb-2">
                          Delete &quot;{story.title}&quot;?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 text-xs"
                            onClick={() => setToDelete(null)}
                            disabled={deleting}
                          >
                            No
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 flex-1 text-xs bg-destructive hover:bg-destructive/90 text-white"
                            onClick={confirmDelete}
                            disabled={deleting}
                          >
                            {deleting ? "..." : "Yes"}
                          </Button>
                        </div>
                        <Popover.Arrow className="fill-card" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setReadingStory(story)}
                      className="text-left group/title flex-1"
                    >
                      <p className="text-[14.5px] font-bold leading-snug text-foreground group-hover/title:text-[hsl(var(--kid-teal))] transition-colors">
                        {story.title}
                      </p>
                    </button>
                    {story.arabic_title && (
                      <ArabicText className="text-sm text-muted-foreground shrink-0">
                        {story.arabic_title}
                      </ArabicText>
                    )}
                  </div>

                  {story.subtitle && (
                    <p className="text-xs font-medium text-muted-foreground line-clamp-1">
                      {story.subtitle}
                    </p>
                  )}

                  {story.summary && (
                    <p className="text-xs text-foreground/80 line-clamp-2 flex-1">
                      {story.summary}
                    </p>
                  )}

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
                    <Badge variant="secondary" className="text-[10px] py-0 font-medium">
                      {CATEGORY_ICON[story.category]} {story.category}
                    </Badge>

                    {story.hero_virtue && (
                      <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        {story.hero_virtue}
                      </Badge>
                    )}

                    {story.reading_time_mins && (
                      <span className="inline-flex items-center text-[10.5px] text-muted-foreground gap-0.5">
                        <Clock className="h-3 w-3" />
                        {story.reading_time_mins}m
                      </span>
                    )}

                    {monthInfo && (
                      <Badge variant="default" className="text-[10px] py-0">
                        {monthInfo.name}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={() => setReadingStory(story)}
                      className="flex-1 h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-xs"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Read Story
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(story)}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                      title="Edit Story"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Generator Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-base">
                ✨
              </span>
              Draft Kid Storybook with AI
            </DialogTitle>
            <DialogDescription>
              Generates an authentic 5-part Islamic storybook for kids with a directly derived mini-quest quiz. Saved safely as a draft.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Duplicate Topic Warning Alert */}
            {aiDuplicateAlert && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 text-foreground">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Topic Already on the Shelf
                    </p>
                    <p className="text-xs font-medium leading-relaxed mt-0.5">
                      {aiDuplicateAlert.message}
                    </p>
                  </div>
                </div>

                {aiDuplicateAlert.suggestions.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Try one of these fresh unwritten topics:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiDuplicateAlert.suggestions.map((sug) => (
                        <button
                          key={sug.topic_slug}
                          type="button"
                          onClick={() => {
                            setAiTopic(sug.title)
                            setAiCategory(sug.category)
                            setAiDuplicateAlert(null)
                          }}
                          className="rounded-full border border-teal-500/40 bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-teal-500/15 transition-colors"
                        >
                          + {sug.title.split(":")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Topic Input */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-topic" className="text-sm font-semibold">
                Topic or Prophet Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ai-topic"
                placeholder="e.g. Prophet Adam (AS), The Ark of Nuh, Conquest of Makkah..."
                value={aiTopic}
                onChange={(e) => {
                  setAiTopic(e.target.value)
                  if (aiDuplicateAlert) setAiDuplicateAlert(null)
                }}
              />
            </div>

            {/* Quick Unwritten Topics Curated Pills */}
            {unwrittenCuratedTopics.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11.5px] font-semibold text-muted-foreground">
                  Quick picks from authentic history:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {unwrittenCuratedTopics.slice(0, 8).map((cur) => (
                    <button
                      key={cur.topic_slug}
                      type="button"
                      onClick={() => {
                        setAiTopic(cur.title)
                        setAiCategory(cur.category)
                        if (cur.hijri_month) setAiHijriMonth(String(cur.hijri_month))
                        if (aiDuplicateAlert) setAiDuplicateAlert(null)
                      }}
                      className="rounded-full border border-border/80 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-teal-500/50 hover:bg-teal-500/10 transition-all text-left"
                    >
                      {cur.title.split(":")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target Age Group + Category */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Age Group</Label>
                <Select
                  value={aiAgeGroup}
                  onValueChange={(v) => setAiAgeGroup(v as typeof aiAgeGroup)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-8">Ages 5-8 (Gentle & Wonder)</SelectItem>
                    <SelectItem value="9-12">Ages 9-12 (Adventure & Values)</SelectItem>
                    <SelectItem value="13-16">Ages 13-16 (Insight & Leadership)</SelectItem>
                    <SelectItem value="all">All Ages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={aiCategory} onValueChange={setAiCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_ICON[c]} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Islamic Month (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Islamic Month (optional season feature)</Label>
              <Select
                value={aiHijriMonth || "none"}
                onValueChange={(v) => setAiHijriMonth(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (shown year-round)</SelectItem>
                  {HIJRI_MONTHS.map((m) => (
                    <SelectItem key={m.number} value={String(m.number)}>
                      {m.number}. {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Guidance */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-instructions" className="text-xs font-semibold">
                Special Teacher Guidance (optional)
              </Label>
              <Textarea
                id="ai-instructions"
                placeholder="e.g. Emphasize patience during Ramadan, or connect to sharing with siblings..."
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="min-h-[60px] text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setAiModalOpen(false)}
              disabled={generatingAi}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAi}
              disabled={generatingAi || !aiTopic.trim()}
              className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
            >
              {generatingAi ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-amber-200" />
                  Drafting Story & Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  Generate Draft
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual / Full Story Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold">
                {editing ? "Edit Storybook" : "New Story"}
              </DialogTitle>
              <DialogDescription>
                Review or customize the story narrative, Quranic gem, moral compass, and linked quiz.
              </DialogDescription>
            </div>
            {form.title.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReadingStory({
                    id: editing?.id || "preview-story",
                    title: form.title || "Story Preview",
                    arabic_title: form.arabic_title || null,
                    subtitle: form.subtitle || null,
                    summary: form.summary || null,
                    content: form.content || null,
                    category: form.category,
                    target_age_group: form.target_age_group,
                    hero_virtue: form.hero_virtue || null,
                    reading_time_mins: Number(form.reading_time_mins) || 4,
                    quran_gem: form.quran_gem,
                    life_lessons: form.life_lessons,
                    reflection_challenge: form.reflection_challenge,
                    cover_image_url: coverPreview || existingCover,
                    quiz_id: form.quiz_id,
                    hijri_month: form.hijri_month ? Number(form.hijri_month) : null,
                    is_published: form.is_published,
                    file_url: existingAttach?.url || null,
                    file_type: existingAttach?.type || null,
                    sort_order: editing?.sort_order || 0,
                    created_at: editing?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                }}
                className="gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 shrink-0"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview Reading View
              </Button>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Title + Arabic */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Prophet Adam (AS): The Beginning..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="arabic">Arabic Title (optional)</Label>
                <Input
                  id="arabic"
                  dir="rtl"
                  value={form.arabic_title}
                  onChange={(e) => setForm((f) => ({ ...f, arabic_title: e.target.value }))}
                  placeholder="آدم عليه السلام"
                  className="font-arabic"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Subtitle / Kid Hook</Label>
              <Input
                id="subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="How saying sorry taught mankind our greatest superpower"
              />
            </div>

            {/* Category + Month + Age Group + Reading Time */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_ICON[c]} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Age Group</Label>
                <Select
                  value={form.target_age_group}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      target_age_group: v as FormState["target_age_group"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-8">5-8 yrs</SelectItem>
                    <SelectItem value="9-12">9-12 yrs</SelectItem>
                    <SelectItem value="13-16">13-16 yrs</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hero Virtue</Label>
                <Input
                  value={form.hero_virtue}
                  onChange={(e) => setForm((f) => ({ ...f, hero_virtue: e.target.value }))}
                  placeholder="Repentance"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Read Time (mins)</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.reading_time_mins}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reading_time_mins: Number(e.target.value) || 4 }))
                  }
                />
              </div>
            </div>

            {/* Wonder Opening (Summary) */}
            <div className="space-y-1.5">
              <Label htmlFor="summary">🌟 The Wonder Opening (Hook)</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="A short curiosity hook that grabs young minds..."
                className="min-h-[70px]"
              />
            </div>

            {/* The Adventure (Content Markdown) */}
            <div className="space-y-1.5">
              <Label htmlFor="content">📖 The Adventure (3 Scenes in Markdown)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder={"### Scene 1: ...\n\n### Scene 2: ...\n\n### Scene 3: ..."}
                className="min-h-[200px] font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Quranic Gem Card Preview (if present) */}
            {form.quran_gem && (
              <div className="space-y-1.5">
                <Label>💎 Linked Quranic Gem Card</Label>
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3 text-xs space-y-1.5">
                  <p className="font-bold text-foreground">
                    {form.quran_gem.surah_name} · {form.quran_gem.ayah_number}
                  </p>
                  <ArabicText className="text-base block text-foreground">
                    {form.quran_gem.arabic}
                  </ArabicText>
                  <p className="italic text-foreground/80">“{form.quran_gem.translation}”</p>
                  {form.quran_gem.child_takeaway && (
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Takeaway: {form.quran_gem.child_takeaway}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Life Lessons Preview (if present) */}
            {form.life_lessons && form.life_lessons.length > 0 && (
              <div className="space-y-1.5">
                <Label>🧭 Moral Compass Lessons</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {form.life_lessons.map((l, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/70 bg-secondary/20 p-2.5 text-xs"
                    >
                      <span className="font-bold block text-foreground">
                        {l.emoji} {l.context}
                      </span>
                      <p className="text-muted-foreground mt-1 line-clamp-3">{l.lesson}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection Challenge */}
            <div className="space-y-1.5">
              <Label htmlFor="reflection">🎯 The Explorer Challenge (Pledge)</Label>
              <Input
                id="reflection"
                value={form.reflection_challenge}
                onChange={(e) => setForm((f) => ({ ...f, reflection_challenge: e.target.value }))}
                placeholder="The next time I make a mistake today, I will apologize quickly..."
              />
            </div>

            {/* Linked Quiz info */}
            {form.quiz_id && (
              <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Linked Story Quest Quiz</p>
                    <p className="text-[11px] text-muted-foreground">ID: {form.quiz_id}</p>
                  </div>
                </div>
                <Link
                  href={`/quizzes/${form.quiz_id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
                >
                  View Linked Quiz <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Canva AI / Dream Lab Cover Prompt Card */}
            <div className="rounded-2xl border border-purple-500/35 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm text-sm">
                    🎨
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Canva AI Dream Lab Cover Prompt
                      <span className="text-[10px] font-normal text-muted-foreground">(16:9 Landscape)</span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const promptToCopy = form.cover_prompt.trim() || getCanvaDreamLabPrompt(form)
                    navigator.clipboard.writeText(promptToCopy)
                    setCopiedEditorPrompt(true)
                    toast.success("Copied Canva Dream Lab prompt to clipboard!")
                    setTimeout(() => setCopiedEditorPrompt(false), 3000)
                  }}
                  className="h-7 text-xs gap-1.5 border-purple-500/40 bg-card hover:bg-purple-500/15"
                >
                  {copiedEditorPrompt ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-purple-500" />
                  )}
                  {copiedEditorPrompt ? "Copied Prompt!" : "Copy Prompt"}
                </Button>
              </div>

              <Textarea
                value={form.cover_prompt || getCanvaDreamLabPrompt(form)}
                onChange={(e) => setForm((f) => ({ ...f, cover_prompt: e.target.value }))}
                placeholder="Canva Dream Lab image prompt..."
                className="min-h-[75px] font-mono text-xs leading-relaxed bg-card/90 border-purple-500/25 resize-y"
              />

              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <span className="text-sm leading-none">💡</span>
                <span>
                  <strong>Tip for Teachers:</strong> Click <strong>Copy Prompt</strong> ➜ Open <strong>Canva → Dream Lab</strong> ➜ Select <strong>16:9 landscape</strong> ➜ Generate &amp; download ➜ Upload into <strong>Add cover</strong> below!
                </span>
              </p>
            </div>

            {/* Media Uploads */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Cover */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Cover Image (optional)</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Auto-optimized to 16:9 WebP
                  </span>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (f) await handleCoverSelect(f)
                    e.target.value = ""
                  }}
                />
                {coverPreview || existingCover ? (
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={coverPreview ?? existingCover ?? ""}
                        alt="Cover"
                        className="h-14 w-20 rounded-lg object-cover border border-border/50 shadow-xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {coverFile ? coverFile.name : "Cover Image"}
                        </p>
                        {optimizingImage ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                            ⚡ Downscaling resolution for web...
                          </p>
                        ) : coverOptimization && coverOptimization.savingsPercent > 0 ? (
                          <div className="space-y-0.5 mt-0.5">
                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <span>⚡ {coverOptimization.width}×{coverOptimization.height} WebP</span>
                              <span>·</span>
                              <span>{formatFileSize(coverOptimization.optimizedSize)}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Saved {coverOptimization.savingsPercent}% (down from {formatFileSize(coverOptimization.originalSize)})
                            </p>
                          </div>
                        ) : coverFile ? (
                          <p className="text-[11px] text-muted-foreground">
                            {formatFileSize(coverFile.size)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Current cover image</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={optimizingImage}
                          onClick={() => coverInputRef.current?.click()}
                          className="h-7 text-xs px-2"
                        >
                          Change
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={optimizingImage}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setCoverFile(null)
                            setExistingCover(null)
                            setCoverOptimization(null)
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={optimizingImage}
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full gap-1.5 border-dashed"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {optimizingImage ? "Optimizing resolution..." : "Add cover (Canva Dream Lab 16:9)"}
                  </Button>
                )}
              </div>

              {/* Attachment */}
              <div className="space-y-1.5">
                <Label>Attachment (PDF / doc, optional)</Label>
                <input
                  ref={attachInputRef}
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setAttachFile(f)
                  }}
                />
                {attachFile || existingAttach ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/30 p-2">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {attachFile ? attachFile.name : (existingAttach?.type ?? "file").toUpperCase()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => attachInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setAttachFile(null)
                        setExistingAttach(null)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => attachInputRef.current?.click()}
                    className="w-full gap-1.5"
                  >
                    <FileText className="h-4 w-4" />
                    Add file
                  </Button>
                )}
              </div>
            </div>

            {/* Publish toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-border/50 bg-secondary/20 p-3">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm font-semibold text-foreground">
                Publish Story to Student Shelf{" "}
                <span className="text-xs font-normal text-muted-foreground block">
                  (Uncheck to keep as a draft while editing or reviewing)
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveStory} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Story"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Storybook Reading Dialog */}
      <Dialog open={!!readingStory} onOpenChange={(open) => !open && setReadingStory(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto no-scrollbar p-0">
          {readingStory && (
            <div>
              {/* Teacher Mode Alert Banner */}
              <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border/70 bg-card/95 backdrop-blur-md px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-600 text-sm">
                    👩‍🏫
                  </span>
                  <span>Teacher Storybook &amp; Classroom Presentation View</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={readingStory.is_published ? "default" : "warning"}
                    className="text-[10px] py-0.5 font-bold"
                  >
                    {readingStory.is_published ? "Published" : "Draft"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 font-semibold"
                    onClick={() => {
                      const s = readingStory
                      setReadingStory(null)
                      openEdit(s)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit Story
                  </Button>
                </div>
              </div>

              <div className="p-5 sm:p-8 space-y-6">
                {/* Cover Banner */}
                {readingStory.cover_image_url ? (
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-border/70 shadow-soft">
                    <img
                      src={readingStory.cover_image_url}
                      alt={readingStory.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[21/9] w-full items-center justify-center rounded-[24px] border border-border/70 bg-secondary/30 text-5xl shadow-soft">
                    {CATEGORY_ICON[readingStory.category] ?? "📜"}
                  </div>
                )}

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold gap-1">
                    <span>{CATEGORY_ICON[readingStory.category] ?? "📜"}</span>
                    <span>{readingStory.category}</span>
                  </Badge>
                  {readingStory.target_age_group && (
                    <Badge variant="outline" className="text-xs font-medium">
                      Ages {readingStory.target_age_group}
                    </Badge>
                  )}
                  {readingStory.reading_time_mins && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {readingStory.reading_time_mins} min read
                    </span>
                  )}
                  {readingStory.hero_virtue && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {readingStory.hero_virtue}
                    </Badge>
                  )}
                  {readingStory.hijri_month && (
                    <Badge variant="default" className="text-xs font-bold">
                      🌙 {getHijriMonthInfo(readingStory.hijri_month)?.name}
                    </Badge>
                  )}
                </div>

                {/* Title & Arabic Title */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                      {readingStory.title}
                    </h1>
                    {readingStory.arabic_title && (
                      <ArabicText className="text-2xl text-foreground/80">
                        {readingStory.arabic_title}
                      </ArabicText>
                    )}
                  </div>
                  {readingStory.subtitle && (
                    <p className="text-base font-medium text-muted-foreground">
                      {readingStory.subtitle}
                    </p>
                  )}
                </div>

                {/* 1. 🌟 The Wonder Opening */}
                {readingStory.summary && (
                  <div className="flex items-start gap-3.5 rounded-[22px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.18)] p-4 sm:p-5 shadow-soft">
                    <span aria-hidden className="text-2xl leading-none">
                      🌟
                    </span>
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-[hsl(var(--kid-teal))]">
                        The Wonder Opening
                      </span>
                      <p className="text-[15px] sm:text-[16px] font-semibold leading-relaxed text-foreground/90">
                        {readingStory.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. 📖 The Adventure (Interactive Flip-Card Scenes) */}
                {readingStory.content && (
                  <StorySceneReader
                    content={readingStory.content}
                    storyTitle={readingStory.title}
                    className="my-6"
                  />
                )}

                {/* 3. 💎 The Quranic Gem Card */}
                {readingStory.quran_gem && (
                  <div id="quran-gem-section">
                    <QuranGemBox gem={readingStory.quran_gem} />
                  </div>
                )}

                {/* 4. 🧭 The Moral Compass (3 Life Lessons) */}
                {readingStory.life_lessons && readingStory.life_lessons.length > 0 && (
                  <StoryMoralCompass
                    lessons={readingStory.life_lessons}
                    virtue={readingStory.hero_virtue}
                  />
                )}

                {/* 5. 🎯 The Explorer Challenge & Quest */}
                <StoryReflectionPledge
                  storyId={readingStory.id}
                  storyTitle={readingStory.title}
                  challenge={readingStory.reflection_challenge}
                  quizId={readingStory.quiz_id}
                />

                {/* Attachment / Extra reading file if any */}
                {readingStory.file_url && (
                  <div className="rounded-2xl border border-border/70 bg-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Attached Reading Resource</span>
                    </div>
                    <a
                      href={readingStory.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"
                    >
                      <span>Open Document</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Bottom Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setReadingStory(null)}
                  >
                    Close Reading View
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={readingStory.is_published ? "outline" : "default"}
                      onClick={async () => {
                        await togglePublish(readingStory)
                        setReadingStory((prev) =>
                          prev ? { ...prev, is_published: !prev.is_published } : null,
                        )
                      }}
                    >
                      {readingStory.is_published ? "Unpublish Story" : "Publish Story"}
                    </Button>
                    <Button
                      className="gap-1.5 bg-primary text-primary-foreground"
                      onClick={() => {
                        const s = readingStory
                        setReadingStory(null)
                        openEdit(s)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit in Studio
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
