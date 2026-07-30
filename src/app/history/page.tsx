"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns aren't worth it for this internal admin tool */

import * as Popover from "@radix-ui/react-popover"
import {
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ArabicText } from "@/components/arabic-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
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
import { CATEGORIES, CATEGORY_ICON, type HistoryStory } from "@/lib/history"
import { supabase } from "@/lib/supabase"

type FormState = {
  title: string
  arabic_title: string
  summary: string
  content: string
  category: string
  hijri_month: string // "" = none, else "1".."12"
  is_published: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  arabic_title: "",
  summary: "",
  content: "",
  category: "Events",
  hijri_month: "",
  is_published: true,
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

  // File state (in the editor)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCover, setExistingCover] = useState<string | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [existingAttach, setExistingAttach] = useState<{ url: string; type: string } | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<HistoryStory | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  async function uploadFile(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop()
    const fileName = `history/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from("memorization-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) {
      console.error("Upload error:", error)
      return null
    }
    const { data } = supabase.storage.from("memorization-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  function fileTypeFor(file: File): "pdf" | "image" | "doc" {
    if (file.type.startsWith("image/")) return "image"
    if (file.type === "application/pdf") return "pdf"
    return "doc"
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    setExistingCover(null)
    setAttachFile(null)
    setExistingAttach(null)
    setEditorOpen(true)
  }

  function openEdit(story: HistoryStory) {
    setEditing(story)
    setForm({
      title: story.title,
      arabic_title: story.arabic_title ?? "",
      summary: story.summary ?? "",
      content: story.content ?? "",
      category: story.category,
      hijri_month: story.hijri_month ? String(story.hijri_month) : "",
      is_published: story.is_published,
    })
    setCoverFile(null)
    setExistingCover(story.cover_image_url)
    setAttachFile(null)
    setExistingAttach(
      story.file_url ? { url: story.file_url, type: story.file_type ?? "doc" } : null,
    )
    setEditorOpen(true)
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
      const url = await uploadFile(coverFile)
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
      const url = await uploadFile(attachFile)
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
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      category: form.category,
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

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setEditorOpen(false)
    await loadStories()
    toast.success(editing ? "Story updated" : `"${payload.title}" added`)
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

  const filtered = stories.filter((s) => {
    const matchesCat = filterCat === "All" || s.category === filterCat
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.summary ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-56 shimmer rounded-lg" />
          <div className="h-5 w-80 shimmer rounded-lg" />
        </div>
        <div className="h-14 shimmer rounded-2xl" />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Islamic History</h1>
          <p className="text-muted-foreground mt-1">
            Stories of prophets, companions, and events students can learn from. {stories.length}{" "}
            {stories.length === 1 ? "story" : "stories"}.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Story
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
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
                  ? "bg-emerald-500/10 text-emerald-500"
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
            <p className="font-medium mb-1">No stories yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first Islamic history story for students to read.
            </p>
            <Button onClick={openCreate} variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Story
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story) => {
            const monthInfo = getHijriMonthInfo(story.hijri_month)
            return (
              <div
                key={story.id}
                className="group relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-border transition-all"
              >
                {/* Cover */}
                {story.cover_image_url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(story.cover_image_url)}
                    className="w-full aspect-[16/9] overflow-hidden bg-secondary"
                  >
                    <img
                      src={story.cover_image_url}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                ) : (
                  <div className="w-full aspect-[16/9] flex items-center justify-center bg-secondary text-4xl">
                    {CATEGORY_ICON[story.category] ?? "📜"}
                  </div>
                )}

                {/* Status + hover actions */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {!story.is_published && (
                    <Badge variant="warning" className="text-[10px] py-0">
                      Draft
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Body */}
                <div className="flex flex-1 flex-col p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{story.title}</p>
                    {story.arabic_title && (
                      <ArabicText className="text-sm text-muted-foreground shrink-0">
                        {story.arabic_title}
                      </ArabicText>
                    )}
                  </div>
                  {story.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {story.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px] py-0">
                      {CATEGORY_ICON[story.category]} {story.category}
                    </Badge>
                    {monthInfo && (
                      <Badge variant="default" className="text-[10px] py-0">
                        {monthInfo.name}
                      </Badge>
                    )}
                    {story.file_url && (
                      <Badge variant="outline" className="text-[10px] py-0 gap-1">
                        <FileText className="h-3 w-3" />
                        {story.file_type?.toUpperCase() ?? "FILE"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Image preview modal */}
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

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Story" : "New Story"}</DialogTitle>
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
                  placeholder="The Birth of Prophet Muhammad ﷺ"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="arabic">Arabic Title (optional)</Label>
                <Input
                  id="arabic"
                  dir="rtl"
                  value={form.arabic_title}
                  onChange={(e) => setForm((f) => ({ ...f, arabic_title: e.target.value }))}
                  placeholder="مولد النبي ﷺ"
                  className="font-arabic"
                />
              </div>
            </div>

            {/* Category + Month */}
            <div className="grid gap-3 sm:grid-cols-2">
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
                <Label>Islamic Month (optional)</Label>
                <Select
                  value={form.hijri_month || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, hijri_month: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (always shown)</SelectItem>
                    {HIJRI_MONTHS.map((m) => (
                      <SelectItem key={m.number} value={String(m.number)}>
                        {m.number}. {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="A short blurb shown on cards and the month banner."
                className="min-h-[60px]"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="content">Article (Markdown)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder={"## Heading\n\nWrite the story here. Use **bold**, *italic*, and\n- bullet points"}
                className="min-h-[180px] font-mono text-[13px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports Markdown: ## headings, **bold**, *italic*, lists, &gt; quotes, [links](url).
              </p>
            </div>

            {/* Media */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Cover */}
              <div className="space-y-1.5">
                <Label>Cover Image (optional)</Label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setCoverFile(f)
                  }}
                />
                {coverPreview || existingCover ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/30 p-2">
                    <img
                      src={coverPreview ?? existingCover ?? ""}
                      alt="Cover"
                      className="h-12 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setCoverFile(null)
                        setExistingCover(null)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full gap-1.5"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add cover
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
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm text-foreground">
                Published{" "}
                <span className="text-muted-foreground">
                  (visible to students — uncheck to keep as draft)
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveStory} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Story"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
