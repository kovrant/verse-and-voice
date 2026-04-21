"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, BookMarked, Users, Search, ImagePlus, X, Eye } from "lucide-react"
import { toast } from "sonner"

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
  file_url?: string | null
  file_type?: string | null
  source?: "catalog" | "media"
  created_at: string
  assignment_count?: number
}

const CATEGORIES = ["Surah", "Dua", "Namaz", "General"]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Surah:   { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  Dua:     { bg: "bg-blue-500/15",    text: "text-blue-400" },
  Namaz:   { bg: "bg-amber-500/15",   text: "text-amber-400" },
  General: { bg: "bg-purple-500/15",  text: "text-purple-400" },
}

export default function MemorizationPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("General")
  const [newImage, setNewImage] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    // Load from memorization_catalog
    const { data: catalog } = await supabase
      .from("memorization_catalog")
      .select("*")
      .order("category")
      .order("title")

    // Load memorization items from media_library
    const { data: mediaItems } = await supabase
      .from("media_library")
      .select("*")
      .eq("type", "memorization")
      .order("category")
      .order("title")

    // Load assignment counts
    const { data: counts } = await supabase
      .from("student_memorization")
      .select("catalog_id")

    const countMap: Record<string, number> = {}
    ;(counts || []).forEach((c: any) => {
      countMap[c.catalog_id] = (countMap[c.catalog_id] || 0) + 1
    })

    // Map catalog items
    const catalogItems: CatalogItem[] = (catalog || []).map(item => ({
      ...item,
      source: "catalog" as const,
      assignment_count: countMap[item.id] || 0,
    }))

    // Map media library items (avoid duplicates by title+category)
    const existingKeys = new Set(catalogItems.map(i => `${i.title.toLowerCase()}|${i.category.toLowerCase()}`))
    const mediaAsCatalog: CatalogItem[] = (mediaItems || [])
      .filter(m => !existingKeys.has(`${m.title.toLowerCase()}|${m.category.toLowerCase()}`))
      .map(m => ({
        id: m.id,
        title: m.title,
        category: m.category,
        image_url: m.file_type === "image" ? m.file_url : null,
        file_url: m.file_url,
        file_type: m.file_type,
        source: "media" as const,
        created_at: m.created_at,
        assignment_count: countMap[m.id] || 0,
      }))

    setItems([...catalogItems, ...mediaAsCatalog])
    setLoading(false)
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from("memorization-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })

    if (error) {
      console.error("Upload error:", error)
      return null
    }

    const { data } = supabase.storage
      .from("memorization-images")
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function deleteImage(imageUrl: string) {
    const path = imageUrl.split("/memorization-images/").pop()
    if (path) {
      await supabase.storage.from("memorization-images").remove([path])
    }
  }

  async function addItem() {
    if (!newTitle.trim()) return
    setAdding(true)

    let imageUrl: string | null = null
    if (newImage) {
      imageUrl = await uploadImage(newImage)
    }

    const { error } = await supabase.from("memorization_catalog").insert({
      title: newTitle.trim(),
      category: newCategory,
      image_url: imageUrl,
    })
    if (error) {
      if (error.code === "23505") {
        toast.error("This item already exists in the catalog.")
      } else {
        toast.error(error.message)
      }
      setAdding(false)
      return
    }
    const addedTitle = newTitle.trim()
    setNewTitle("")
    setNewImage(null)
    setAdding(false)
    await loadItems()
    toast.success(`"${addedTitle}" added to catalog`)
  }

  async function deleteItem(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (item.image_url) {
      await deleteImage(item.image_url)
    }
    await supabase.from("memorization_catalog").delete().eq("id", id)
    await loadItems()
    toast.success(`"${item.title}" deleted`)
  }

  async function handleEditImage(itemId: string, file: File) {
    setUploadingFor(itemId)
    const item = items.find(i => i.id === itemId)

    // Delete old image if exists
    if (item?.image_url) {
      await deleteImage(item.image_url)
    }

    const imageUrl = await uploadImage(file)
    if (imageUrl) {
      await supabase
        .from("memorization_catalog")
        .update({ image_url: imageUrl })
        .eq("id", itemId)
    }
    setUploadingFor(null)
    await loadItems()
  }

  async function removeImage(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (item?.image_url) {
      await deleteImage(item.image_url)
      await supabase
        .from("memorization_catalog")
        .update({ image_url: null })
        .eq("id", itemId)
      await loadItems()
    }
  }

  const filtered = items.filter(item => {
    const matchesCat = filterCat === "All" || item.category === filterCat
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const grouped: Record<string, CatalogItem[]> = {}
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-48 shimmer rounded-lg" />
          <div className="h-5 w-72 shimmer rounded-lg" />
        </div>
        <div className="h-24 shimmer rounded-2xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 shimmer rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Memorization</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage the catalog of items students can memorize. {items.length} items total.
        </p>
      </div>

      {/* Add new item */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Surah Baqarah, Dua for Rain..."
              onKeyDown={(e) => e.key === "Enter" && !newImage && addItem()}
              className="flex-1"
            />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setNewImage(file)
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <ImagePlus className="h-4 w-4" />
              {newImage ? "Change" : "Image"}
            </Button>
            <Button onClick={addItem} disabled={adding || !newTitle.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {newImage && (
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
              <img
                src={URL.createObjectURL(newImage)}
                alt="Preview"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="text-sm text-muted-foreground flex-1 truncate">{newImage.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setNewImage(null)} className="h-7">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="flex items-center rounded-xl border border-border/50 bg-card p-1 gap-1">
          {["All", ...CATEGORIES].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCat === c
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input for editing existing items */}
      <input
        ref={editFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && uploadingFor) {
            handleEditImage(uploadingFor, file)
          }
          if (editFileRef.current) editFileRef.current.value = ""
        }}
      />

      {/* Preview modal (images and PDFs) */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] p-2 m-4" onClick={(e) => e.stopPropagation()}>
            {previewUrl.toLowerCase().endsWith(".pdf") || previewUrl.includes("/pdf") ? (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <span className="text-sm font-medium">PDF Preview</span>
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  src={previewUrl}
                  className="w-full rounded-b-2xl"
                  style={{ height: "75vh" }}
                />
              </div>
            ) : (
              <>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[80vh] rounded-2xl object-contain mx-auto"
                />
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Catalog grid */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookMarked className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No items found</p>
            <p className="text-sm text-muted-foreground">Add memorization items above or adjust your filters.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => {
          const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.General
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={`${colors.bg} ${colors.text} border-0`}>{category}</Badge>
                <span className="text-sm text-muted-foreground">{catItems.length} items</span>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catItems.map(item => {
                  const isMedia = item.source === "media"
                  return (
                  <div
                    key={item.id}
                    className="relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-border transition-all group"
                  >
                    {/* Image/Preview area */}
                    {item.image_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(item.image_url)}
                        className="w-full aspect-[3/2] overflow-hidden bg-secondary"
                      >
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                    ) : isMedia && item.file_type === "pdf" ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(item.file_url || null)}
                        className="w-full aspect-[3/2] overflow-hidden bg-secondary/80 relative flex items-center justify-center"
                      >
                        <div className="absolute inset-0 islamic-pattern opacity-30" />
                        <div className="relative flex flex-col items-center gap-1">
                          <BookMarked className={`h-8 w-8 ${colors.text} opacity-40`} />
                          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">PDF</span>
                        </div>
                      </button>
                    ) : (
                      <div className={`w-full aspect-[3/2] flex items-center justify-center ${colors.bg}`}>
                        <BookMarked className={`h-10 w-10 ${colors.text} opacity-40`} />
                      </div>
                    )}

                    {/* Media library badge */}
                    {isMedia && (
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] font-medium text-blue-400 backdrop-blur-sm">
                          Media Library
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-3.5 space-y-2">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <div className="flex items-center justify-between">
                        {(item.assignment_count || 0) > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {item.assignment_count} student{(item.assignment_count || 0) > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">No assignments</span>
                        )}
                        <Badge className={`${colors.bg} ${colors.text} border-0 text-[10px] py-0`}>{category}</Badge>
                      </div>
                    </div>

                    {/* Hover actions overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMedia ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(item.file_url || item.image_url)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <>
                          {item.image_url ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewUrl(item.image_url)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                                title="View image"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setUploadingFor(item.id); editFileRef.current?.click() }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                                title="Change image"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-red-400 hover:bg-black/80 backdrop-blur-sm"
                                title="Remove image"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setUploadingFor(item.id); editFileRef.current?.click() }}
                              className="flex h-7 items-center gap-1 px-2 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 backdrop-blur-sm"
                              title="Add image"
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-red-400 hover:bg-black/80 backdrop-blur-sm"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
