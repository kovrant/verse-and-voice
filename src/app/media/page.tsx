"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import {
  BookOpen,
  Check,
  Eye,
  FileText,
  FolderOpen,
  HardDrive,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { toast } from "@/lib/toast"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoading } from "@/components/page-loading"
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
import {
  extractParaNumber,
  fileTypeOf,
  isBulkMediaFile,
  storagePathFromPublicUrl,
  titleFromFilename,
} from "@/lib/media-upload"
import { supabase } from "@/lib/supabase"

// react-pdf is client-only (uses worker + canvas) — avoid SSR
const PdfThumbnail = dynamic(
  () => import("@/components/pdf-thumbnail").then((m) => m.PdfThumbnail),
  { ssr: false },
)

interface MediaItem {
  id: string
  title: string
  type: string
  category: string
  file_url: string
  file_type: string
  meta: Record<string, any>
  created_at: string
}

const MEDIA_TYPES = [
  { value: "quran", label: "Quran", icon: "📖" },
  { value: "memorization", label: "Memorization", icon: "🕌" },
  { value: "qaida", label: "Qaida", icon: "🔤" },
  { value: "general", label: "General", icon: "📁" },
]

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  quran: ["Para"],
  memorization: ["Surah", "Dua", "Namaz", "General"],
  qaida: ["Noorani", "Baghdadi", "Madani"],
  general: ["Document", "Resource", "Other"],
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  quran: { bg: "bg-secondary", text: "text-muted-foreground" },
  memorization: { bg: "bg-secondary", text: "text-muted-foreground" },
  qaida: { bg: "bg-secondary", text: "text-muted-foreground" },
  general: { bg: "bg-secondary", text: "text-muted-foreground" },
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("All")
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MediaItem[]>([])
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Upload form
  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("quran")
  const [category, setCategory] = useState("Para")
  const [paraNumber, setParaNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Create the image preview URL once per file and revoke it on change/unmount,
  // instead of calling URL.createObjectURL() inline in render (which leaks a
  // blob on every re-render, e.g. each keystroke in the Title field).
  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setFilePreview(null)
  }, [file])

  // Custom categories added by the user
  const [customCategories, setCustomCategories] = useState<Record<string, string[]>>({})
  const [newCategoryInput, setNewCategoryInput] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)

  // Merged categories: defaults + custom + categories from existing items
  function getCategories(mediaType: string): string[] {
    const defaults = DEFAULT_CATEGORIES[mediaType] || []
    const custom = customCategories[mediaType] || []
    const fromItems = Array.from(
      new Set(items.filter((i) => i.type === mediaType).map((i) => i.category)),
    )
    return Array.from(new Set([...defaults, ...custom, ...fromItems]))
  }

  // Bulk upload
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkType, setBulkType] = useState("memorization")
  const [bulkCategory, setBulkCategory] = useState("General")
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, current: "" })
  const bulkFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .order("type")
      .order("created_at", { ascending: false })

    const all = data || []

    // Sort quran paras by para number ascending
    const sorted = all.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      if (a.type === "quran") {
        return (a.meta?.para_number || 999) - (b.meta?.para_number || 999)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    setItems(sorted)
    setLoading(false)
  }

  function resetForm() {
    setTitle("")
    setType("quran")
    setCategory("Para")
    setParaNumber("")
    setFile(null)
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true)

    const ext = file.name.split(".").pop()
    const fileType = fileTypeOf(file)
    const folder = type
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, file, { cacheControl: "3600" })

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName)

    const meta: Record<string, any> = {}
    if (type === "quran" && paraNumber) {
      meta.para_number = parseInt(paraNumber)
    }

    const { error: dbError } = await supabase.from("media_library").insert({
      title: title.trim(),
      type,
      category,
      file_url: urlData.publicUrl,
      file_type: fileType,
      meta,
    })

    if (dbError) {
      toast.error("Error saving: " + dbError.message)
      setUploading(false)
      return
    }

    setUploading(false)
    setUploadOpen(false)
    resetForm()
    await loadItems()
  }

  async function handleBulkUpload(files: FileList) {
    const list = Array.from(files).filter(isBulkMediaFile)
    if (list.length === 0) {
      toast.error("No image or PDF files found in selection.")
      return
    }

    const prepared = list.map((f) => {
      const fileType = fileTypeOf(f)
      const paraNum =
        bulkType === "quran" && fileType === "pdf" ? extractParaNumber(f.name) : null
      const title = paraNum ? `Para ${paraNum}` : titleFromFilename(f.name)
      return { file: f, fileType, paraNum, title }
    })
    if (bulkType === "quran") {
      prepared.sort((a, b) => (a.paraNum || 999) - (b.paraNum || 999))
    }

    setBulkOpen(false)
    setBulkUploading(true)
    setBulkProgress({ done: 0, total: prepared.length, current: "" })
    const failed: string[] = []

    for (let i = 0; i < prepared.length; i++) {
      const { file, fileType, paraNum, title } = prepared[i]
      setBulkProgress({ done: i, total: prepared.length, current: title })

      const ext = file.name.split(".").pop()
      const fileName = `${bulkType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file, { cacheControl: "3600" })

      if (uploadError) {
        failed.push(`${title}: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName)

      const meta: Record<string, any> = {}
      if (paraNum) meta.para_number = paraNum

      const { error: dbError } = await supabase.from("media_library").insert({
        title,
        type: bulkType,
        category: bulkCategory,
        file_url: urlData.publicUrl,
        file_type: fileType,
        meta,
      })

      if (dbError) {
        failed.push(`${title}: ${dbError.message}`)
      }
    }

    setBulkProgress({ done: prepared.length, total: prepared.length, current: "" })
    setBulkUploading(false)

    if (failed.length > 0) {
      toast.warning(
        `Uploaded ${prepared.length - failed.length}/${prepared.length} files. ${failed.length} failed.`,
      )
    } else {
      toast.success(`All ${prepared.length} files uploaded successfully.`)
    }

    await loadItems()
  }

  async function deleteItems(toRemove: MediaItem[]) {
    if (toRemove.length === 0) return
    setDeleting(true)

    const ids = toRemove.map((i) => i.id)
    const { error: dbError } = await supabase.from("media_library").delete().in("id", ids)
    if (dbError) {
      toast.error(`Couldn't delete: ${dbError.message}`)
      setDeleting(false)
      return
    }

    const paths = toRemove
      .map((i) => storagePathFromPublicUrl(i.file_url))
      .filter((p): p is string => !!p)
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("media").remove(paths)
      if (storageError) {
        toast.warning("Removed from the library, but some files couldn't be deleted from storage.")
      }
    }

    const gone = new Set(ids)
    setPreviewItem((cur) => (cur && gone.has(cur.id) ? null : cur))
    setPendingDelete([])
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    setDeleting(false)
    toast.success(toRemove.length === 1 ? `"${toRemove[0].title}" deleted` : `${toRemove.length} files deleted`)
    await loadItems()
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(groupItems: MediaItem[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allOn = groupItems.every((i) => next.has(i.id))
      for (const i of groupItems) {
        if (allOn) next.delete(i.id)
        else next.add(i.id)
      }
      return next
    })
  }

  const filtered = items.filter((item) => {
    const matchesType = filterType === "All" || item.type === filterType
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  // Group by type
  const grouped: Record<string, MediaItem[]> = {}
  filtered.forEach((item) => {
    if (!grouped[item.type]) grouped[item.type] = []
    grouped[item.type].push(item)
  })

  const selectedItems = items.filter((i) => selected.has(i.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))

  // Stats
  const totalFiles = items.length
  const totalQuran = items.filter((i) => i.type === "quran").length
  const totalMem = items.filter((i) => i.type === "memorization").length

  if (loading) return <PageLoading variant="media" />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-foreground">Media Library</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Central hub for all uploads — Quran, memorization, and resources
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={bulkFileRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleBulkUpload(e.target.files)
              if (bulkFileRef.current) bulkFileRef.current.value = ""
            }}
          />
          <Button variant="outline" onClick={() => setBulkOpen(true)} disabled={bulkUploading}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group relative overflow-hidden hover:border-border">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalQuran}</p>
              <p className="text-xs text-muted-foreground">Quran Paras</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden hover:border-border">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMem}</p>
              <p className="text-xs text-muted-foreground">Memorization</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden hover:border-border">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFiles}</p>
              <p className="text-xs text-muted-foreground">Total Files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk upload progress */}
      {bulkUploading && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Uploading{" "}
                <span className="text-foreground font-medium">{bulkProgress.current}</span>
              </span>
              <span className="text-foreground font-medium">
                {bulkProgress.done}/{bulkProgress.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="flex items-center rounded-xl border border-border/50 bg-card p-1 gap-1">
          {["All", ...MEDIA_TYPES.map((t) => t.value)].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filterType === t
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t === "All" ? "All" : MEDIA_TYPES.find((mt) => mt.value === t)?.label || t}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
            {selected.size !== filtered.length ? ` of ${filtered.length}` : ""}
          </span>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-foreground/35 bg-transparent">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() => {
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (allFilteredSelected) filtered.forEach((i) => next.delete(i.id))
                    else filtered.forEach((i) => next.add(i.id))
                    return next
                  })
                }}
                className="sr-only"
              />
              {allFilteredSelected && <Check className="h-3 w-3 text-foreground" strokeWidth={3} />}
            </span>
            Select all
          </label>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={() => setPendingDelete(selectedItems)}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete selected
          </Button>
        </div>
      )}

      {/* Bulk upload: tag the batch, then pick images and/or PDFs */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload</DialogTitle>
            <DialogDescription>
              Tag the whole batch, then pick as many images or PDFs as you want. Titles come from
              the file name (Quran PDFs named like Para 1 stay Paras).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={bulkType}
                onValueChange={(v) => {
                  setBulkType(v)
                  setBulkCategory(getCategories(v)[0] || "General")
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCategories(bulkType).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-2" onClick={() => bulkFileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Choose files
          </Button>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload to Media Library</DialogTitle>
            <DialogDescription>Tag your file so it shows up in the right place.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Para 1, Surah Fatiha image..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v)
                    setCategory(getCategories(v)[0] || "general")
                    setAddingCategory(false)
                    setNewCategoryInput("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                {addingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="New category name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCategoryInput.trim()) {
                          const name = newCategoryInput.trim()
                          setCustomCategories((prev) => ({
                            ...prev,
                            [type]: [...(prev[type] || []), name],
                          }))
                          setCategory(name)
                          setNewCategoryInput("")
                          setAddingCategory(false)
                        }
                        if (e.key === "Escape") {
                          setAddingCategory(false)
                          setNewCategoryInput("")
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={!newCategoryInput.trim()}
                      onClick={() => {
                        const name = newCategoryInput.trim()
                        if (!name) return
                        setCustomCategories((prev) => ({
                          ...prev,
                          [type]: [...(prev[type] || []), name],
                        }))
                        setCategory(name)
                        setNewCategoryInput("")
                        setAddingCategory(false)
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingCategory(false)
                        setNewCategoryInput("")
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={category}
                    onValueChange={(v) => {
                      if (v === "__add_new__") {
                        setAddingCategory(true)
                      } else {
                        setCategory(v)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories(type).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-primary">
                        + Add New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {type === "quran" && (
              <div className="space-y-2">
                <Label>Para Number (1-30)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={paraNumber}
                  onChange={(e) => setParaNumber(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>File *</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
                  {file.type.startsWith("image/") && filePreview ? (
                    <img src={filePreview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border/50 bg-secondary/20 py-8 text-center hover:border-border hover:bg-secondary transition-all"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF or Image</p>
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleUpload}
                disabled={uploading || !file || !title.trim()}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                <div>
                  <p className="font-semibold">{previewItem.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {previewItem.type} &middot; {previewItem.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPendingDelete([previewItem])
                      setPreviewItem(null)
                    }}
                    className="text-destructive hover:text-destructive/80"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="max-h-[75vh] overflow-auto p-1">
                {previewItem.file_type === "pdf" ? (
                  <iframe
                    src={previewItem.file_url}
                    className="w-full rounded-xl"
                    style={{ height: "75vh" }}
                  />
                ) : (
                  <img
                    src={previewItem.file_url}
                    alt={previewItem.title}
                    className="w-full rounded-xl object-contain max-h-[75vh]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={pendingDelete.length > 0}
        onOpenChange={(open) => !open && !deleting && setPendingDelete([])}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingDelete.length === 1
                ? `Delete “${pendingDelete[0].title}”?`
                : `Delete ${pendingDelete.length} files?`}
            </DialogTitle>
            <DialogDescription>
              This removes {pendingDelete.length === 1 ? "the file" : "these files"} from the
              library and deletes {pendingDelete.length === 1 ? "it" : "them"} from storage. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setPendingDelete([])}
              disabled={deleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteItems(pendingDelete)}
              disabled={deleting}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            {items.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-1">No files yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Upload your first file to get started
                </p>
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No files match your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([groupType, groupItems]) => {
          const colors = TYPE_COLORS[groupType] || TYPE_COLORS.general
          const typeLabel = MEDIA_TYPES.find((t) => t.value === groupType)?.label || groupType
          return (
            <div key={groupType} className="space-y-3">
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <label className="flex items-center cursor-pointer">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-foreground/35 bg-transparent">
                      <input
                        type="checkbox"
                        checked={groupItems.length > 0 && groupItems.every((i) => selected.has(i.id))}
                        onChange={() => toggleGroup(groupItems)}
                        className="sr-only"
                        aria-label={`Select all ${typeLabel}`}
                      />
                      {groupItems.every((i) => selected.has(i.id)) && (
                        <Check className="h-3 w-3 text-foreground" strokeWidth={3} />
                      )}
                    </span>
                  </label>
                )}
                <Badge className={`${colors.bg} ${colors.text} border-0`}>{typeLabel}</Badge>
                <span className="text-sm text-muted-foreground">{groupItems.length} files</span>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setPreviewItem(item)
                      }
                    }}
                    className={`relative rounded-2xl border bg-card overflow-hidden hover:border-border transition-all text-left group cursor-pointer ${
                      selected.has(item.id) ? "border-primary ring-2 ring-primary/20" : "border-border/50"
                    }`}
                  >
                    <label
                      className={`absolute top-2 left-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm border border-white/90 bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.15)] transition-opacity ${
                        selected.size > 0
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 max-lg:opacity-100"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        className="sr-only"
                        aria-label={`Select ${item.title}`}
                      />
                      {selected.has(item.id) && (
                        <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />
                      )}
                    </label>
                    {/* Preview area */}
                    {item.file_type === "image" ? (
                      <div className="aspect-[4/3] overflow-hidden bg-secondary">
                        <img
                          src={item.file_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] overflow-hidden bg-secondary/80 relative flex items-center justify-center">
                        <PdfThumbnail
                          fileUrl={item.file_url}
                          width={320}
                          fallback={
                            <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                              {item.meta?.para_number ? (
                                <div className="relative flex flex-col items-center gap-1">
                                  <span className="text-3xl font-bold text-primary/30">
                                    {item.meta.para_number}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                                    Para
                                  </span>
                                </div>
                              ) : (
                                <FileText className="h-10 w-10 text-muted-foreground/20 relative" />
                              )}
                            </div>
                          }
                        />
                        {/* Para badge (top-left, overlays the rendered PDF) */}
                        {item.meta?.para_number && (
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <span className="px-1.5 py-0.5 rounded bg-primary/85 text-[9px] font-semibold text-primary-foreground backdrop-blur-sm uppercase tracking-wider">
                              Para {item.meta.para_number}
                            </span>
                          </div>
                        )}
                        {/* PDF tag (bottom-right) */}
                        <div className="absolute bottom-1 right-1 z-10">
                          <span className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] font-medium text-white backdrop-blur-sm uppercase">
                            PDF
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className={`${colors.bg} ${colors.text} border-0 text-[10px] py-0`}>
                          {item.category}
                        </Badge>
                        {item.meta?.para_number && (
                          <span className="text-[10px] text-muted-foreground">
                            Para {item.meta.para_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover overlay — always visible on touch (no hover) */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm">
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingDelete([item])
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-destructive backdrop-blur-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
