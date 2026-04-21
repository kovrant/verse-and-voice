"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Upload, Trash2, FileText, Image as ImageIcon, Search, Eye, X, HardDrive, BookOpen, Sparkles, FolderOpen } from "lucide-react"
import { toast } from "sonner"

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
  { value: "general", label: "General", icon: "📁" },
]

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  quran: ["Para"],
  memorization: ["Surah", "Dua", "Namaz", "General"],
  general: ["Document", "Resource", "Other"],
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  quran:        { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  memorization: { bg: "bg-amber-500/15",   text: "text-amber-400" },
  general:      { bg: "bg-blue-500/15",    text: "text-blue-400" },
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("All")
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)

  // Upload form
  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("quran")
  const [category, setCategory] = useState("Para")
  const [paraNumber, setParaNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Custom categories added by the user
  const [customCategories, setCustomCategories] = useState<Record<string, string[]>>({})
  const [newCategoryInput, setNewCategoryInput] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)

  // Merged categories: defaults + custom + categories from existing items
  function getCategories(mediaType: string): string[] {
    const defaults = DEFAULT_CATEGORIES[mediaType] || []
    const custom = customCategories[mediaType] || []
    const fromItems = Array.from(new Set(items.filter(i => i.type === mediaType).map(i => i.category)))
    return Array.from(new Set([...defaults, ...custom, ...fromItems]))
  }

  // Bulk upload
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, current: "" })
  const bulkFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .order("type")
      .order("created_at", { ascending: false })

    const all = data || []

    // One-time repair: fix quran items with missing para_number or wrong titles
    const needsRepair = all.filter(
      item => item.type === "quran" && (!item.meta?.para_number || !item.title.match(/^Para \d+$/))
    )
    for (const item of needsRepair) {
      // Try to extract para number from title
      const numMatch = item.title.match(/(\d+)/)
      if (numMatch) {
        const num = parseInt(numMatch[1])
        if (num >= 1 && num <= 30) {
          const newTitle = `Para ${num}`
          const newMeta = { ...item.meta, para_number: num }
          await supabase
            .from("media_library")
            .update({ title: newTitle, meta: newMeta })
            .eq("id", item.id)
          item.title = newTitle
          item.meta = newMeta
        }
      }
    }

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
    const fileType = file.type.startsWith("image/") ? "image" : "pdf"
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

  function extractParaNumber(filename: string): number | null {
    // Match: "Para 1", "para-01", "para_1", "Para1", "30 para", "30para", "1.pdf", "01.pdf"
    const match =
      filename.match(/(?:para[\s_-]*)(\d+)/i) ||   // "para 1", "para-01"
      filename.match(/(\d+)[\s_-]*para/i) ||         // "30 para", "30-para"
      filename.match(/^(\d+)\./i)                     // "1.pdf", "01.pdf"
    if (match) {
      const num = parseInt(match[1])
      if (num >= 1 && num <= 30) return num
    }
    return null
  }

  async function handleBulkUpload(files: FileList) {
    const pdfFiles = Array.from(files).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
    if (pdfFiles.length === 0) {
      toast.error("No PDF files found in selection.")
      return
    }

    // Sort by extracted para number
    const sorted = pdfFiles
      .map(f => ({ file: f, paraNum: extractParaNumber(f.name) }))
      .sort((a, b) => (a.paraNum || 999) - (b.paraNum || 999))

    setBulkUploading(true)
    setBulkProgress({ done: 0, total: sorted.length, current: "" })
    let failed: string[] = []

    for (let i = 0; i < sorted.length; i++) {
      const { file, paraNum } = sorted[i]
      const paraLabel = paraNum ? `Para ${paraNum}` : file.name.replace(/\.[^.]+$/, "")
      setBulkProgress({ done: i, total: sorted.length, current: paraLabel })

      const ext = file.name.split(".").pop()
      const fileName = `quran/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file, { cacheControl: "3600" })

      if (uploadError) {
        failed.push(`${paraLabel}: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName)

      const meta: Record<string, any> = {}
      if (paraNum) meta.para_number = paraNum

      const { error: dbError } = await supabase.from("media_library").insert({
        title: paraLabel,
        type: "quran",
        category: "Para",
        file_url: urlData.publicUrl,
        file_type: "pdf",
        meta,
      })

      if (dbError) {
        failed.push(`${paraLabel}: ${dbError.message}`)
      }
    }

    setBulkProgress({ done: sorted.length, total: sorted.length, current: "" })
    setBulkUploading(false)

    if (failed.length > 0) {
      toast.warning(`Uploaded ${sorted.length - failed.length}/${sorted.length} files. ${failed.length} failed.`)
    } else {
      toast.success(`All ${sorted.length} files uploaded successfully.`)
    }

    await loadItems()
  }

  async function deleteItem(item: MediaItem) {
    // Delete from storage
    const path = item.file_url.split("/media/").pop()
    if (path) {
      await supabase.storage.from("media").remove([path])
    }

    await supabase.from("media_library").delete().eq("id", item.id)
    setPreviewItem(null)
    toast.success(`"${item.title}" deleted`)
    await loadItems()
  }

  const filtered = items.filter(item => {
    const matchesType = filterType === "All" || item.type === filterType
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  // Group by type
  const grouped: Record<string, MediaItem[]> = {}
  filtered.forEach(item => {
    if (!grouped[item.type]) grouped[item.type] = []
    grouped[item.type].push(item)
  })

  // Stats
  const totalFiles = items.length
  const totalQuran = items.filter(i => i.type === "quran").length
  const totalMem = items.filter(i => i.type === "memorization").length

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-48 shimmer rounded-lg" />
          <div className="h-5 w-72 shimmer rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-40 shimmer rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-gold">Media Library</span>
          </h1>
          <p className="text-muted-foreground mt-1">Central hub for all uploads — Quran, memorization, and resources</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={bulkFileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleBulkUpload(e.target.files)
              if (bulkFileRef.current) bulkFileRef.current.value = ""
            }}
          />
          <Button variant="outline" onClick={() => bulkFileRef.current?.click()} disabled={bulkUploading}>
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
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.03]" />
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <BookOpen className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalQuran}</p>
              <p className="text-xs text-muted-foreground">Quran Paras</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.03]" />
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMem}</p>
              <p className="text-xs text-muted-foreground">Memorization</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-[0.03]" />
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <HardDrive className="h-5 w-5 text-blue-400" />
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
                Uploading <span className="text-foreground font-medium">{bulkProgress.current}</span>
              </span>
              <span className="text-emerald-400 font-medium">{bulkProgress.done}/{bulkProgress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
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
          {["All", ...MEDIA_TYPES.map(t => t.value)].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filterType === t
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t === "All" ? "All" : MEDIA_TYPES.find(mt => mt.value === t)?.label || t}
            </button>
          ))}
        </div>
      </div>

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
                <Select value={type} onValueChange={(v) => { setType(v); setCategory(getCategories(v)[0] || "general"); setAddingCategory(false); setNewCategoryInput("") }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPES.map(t => (
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
                          setCustomCategories(prev => ({
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
                        setCustomCategories(prev => ({
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
                    <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryInput("") }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Select value={category} onValueChange={(v) => {
                    if (v === "__add_new__") {
                      setAddingCategory(true)
                    } else {
                      setCategory(v)
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories(type).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-emerald-400">
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
                  {file.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(file)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                      <FileText className="h-6 w-6 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border/50 bg-secondary/20 py-8 text-center hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF or Image</p>
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="min-w-[120px]">
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
              <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm() }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                <div>
                  <p className="font-semibold">{previewItem.title}</p>
                  <p className="text-xs text-muted-foreground">{previewItem.type} &middot; {previewItem.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteItem(previewItem)} className="text-red-400 hover:text-red-300">
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
                <p className="text-sm text-muted-foreground mb-5">Upload your first file to get started</p>
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
          const typeLabel = MEDIA_TYPES.find(t => t.value === groupType)?.label || groupType
          return (
            <div key={groupType} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={`${colors.bg} ${colors.text} border-0`}>{typeLabel}</Badge>
                <span className="text-sm text-muted-foreground">{groupItems.length} files</span>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {groupItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-border transition-all text-left group"
                  >
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
                        {/* Decorative background */}
                        <div className="absolute inset-0 islamic-pattern opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/60" />
                        {/* Para number or file icon */}
                        {item.meta?.para_number ? (
                          <div className="relative flex flex-col items-center gap-1">
                            <span className="text-3xl font-bold text-emerald-400/30">{item.meta.para_number}</span>
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Para</span>
                          </div>
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground/20 relative" />
                        )}
                        <div className="absolute bottom-1 right-1 z-10">
                          <span className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] font-medium text-white backdrop-blur-sm uppercase">PDF</span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className={`${colors.bg} ${colors.text} border-0 text-[10px] py-0`}>{item.category}</Badge>
                        {item.meta?.para_number && (
                          <span className="text-[10px] text-muted-foreground">Para {item.meta.para_number}</span>
                        )}
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm">
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
