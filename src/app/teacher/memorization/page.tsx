"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import * as Popover from "@radix-ui/react-popover"
import {
  BookMarked,
  Eye,
  ImagePlus,
  Layers,
  Loader2,
  PenLine,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { labelFor, loadChunksFor, type MemChunk } from "@/components/memorization-chunks"
import { PageLoading } from "@/components/page-loading"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { safeUploadExtension } from "@/lib/media-upload"
import { paintMemCard, paletteFor, splitParts } from "@/lib/mem-card"
import { type CatalogItem } from "@/lib/memorization"
import { CACHE_FOREVER } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"

/**
 * The catalog admin view: a shared catalog entry plus the fields only this page
 * needs — media-library provenance and the assignment count it tallies itself.
 */
interface CatalogRow extends CatalogItem {
  file_url?: string | null
  file_type?: string | null
  source?: "catalog" | "media"
  created_at: string
  assignment_count?: number
  arabic_text?: string | null
}

const CATEGORIES = ["Surah", "Dua", "Namaz", "General"]

/** Remove a stored picture by its public URL (best-effort). */
async function removeStored(url: string | null | undefined) {
  const path = url?.split("/memorization-images/").pop()
  if (path) await supabase.storage.from("memorization-images").remove([path])
}

async function uploadCard(blob: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from("memorization-images")
    .upload(path, blob, { cacheControl: CACHE_FOREVER, upsert: false, contentType: "image/png" })
  if (error) throw error
  return supabase.storage.from("memorization-images").getPublicUrl(path).data.publicUrl
}

/**
 * Paint the cover (the whole text) and one card per line, and save them.
 * Existing parts are repainted in place, in order, so students keep their
 * progress; extra lines become new parts and missing lines delete parts.
 */
async function saveItemText(
  itemId: string,
  oldCoverUrl: string | null,
  text: string,
  onEach?: (done: number, total: number) => void,
): Promise<number> {
  const parts = splitParts(text)
  const palette = paletteFor(itemId)
  const tag = () => Math.random().toString(36).slice(2)
  const existing = (await loadChunksFor([itemId]))[itemId] || []
  const total = parts.length + 1

  const coverUrl = await uploadCard(
    await paintMemCard(parts.join("\n"), palette),
    `covers/${itemId}-${tag()}.png`,
  )
  const { error } = await supabase
    .from("memorization_catalog")
    .update({ image_url: coverUrl, arabic_text: parts.join("\n") })
    .eq("id", itemId)
  if (error) throw error
  if (oldCoverUrl && oldCoverUrl !== coverUrl) await removeStored(oldCoverUrl)
  onEach?.(1, total)

  let nextIndex = existing.length ? Math.max(...existing.map((c) => c.order_index)) + 1 : 0
  for (let i = 0; i < parts.length; i++) {
    const url = await uploadCard(
      await paintMemCard(parts[i], palette),
      `chunks/${itemId}/${i}-${tag()}.png`,
    )
    const old = existing[i]
    const { error: partErr } = old
      ? await supabase
          .from("memorization_chunks")
          .update({ image_url: url, arabic_text: parts[i] })
          .eq("id", old.id)
      : await supabase.from("memorization_chunks").insert({
          catalog_id: itemId,
          order_index: nextIndex++,
          image_url: url,
          arabic_text: parts[i],
        })
    if (partErr) throw partErr
    if (old) await removeStored(old.image_url)
    onEach?.(i + 2, total)
  }

  for (const extra of existing.slice(parts.length)) {
    await supabase.from("memorization_chunks").delete().eq("id", extra.id)
    await removeStored(extra.image_url)
  }
  return parts.length
}

/** Upload ordered part images for a catalog item. Returns how many rows landed. */
async function uploadChunkImages(
  catalogId: string,
  files: File[],
  startIndex: number,
  onEach?: (done: number, total: number) => void,
): Promise<number> {
  const images = files.filter((f) => f.type.startsWith("image/"))
  let completed = 0

  const uploadResults = await Promise.all(
    images.map(async (file, i) => {
      const idx = startIndex + i
      const ext = safeUploadExtension(file.name, "png")
      const path = `chunks/${catalogId}/${idx}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("memorization-images")
        .upload(path, file, { cacheControl: CACHE_FOREVER, upsert: false })
      completed++
      onEach?.(completed, images.length)

      if (upErr) {
        toast.error(upErr.message)
        return null
      }
      const { data } = supabase.storage.from("memorization-images").getPublicUrl(path)
      return { catalog_id: catalogId, order_index: idx, image_url: data.publicUrl }
    }),
  )

  const rows = uploadResults.filter(
    (r): r is { catalog_id: string; order_index: number; image_url: string } => r !== null,
  )

  if (rows.length > 0) {
    const { error } = await supabase.from("memorization_chunks").insert(rows)
    if (error) {
      toast.error(error.message)
      return 0
    }
  }
  return rows.length
}

export default function MemorizationPage() {
  const [items, setItems] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("General")
  const [newText, setNewText] = useState("")
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<CatalogRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [chunkCounts, setChunkCounts] = useState<Record<string, number>>({})
  const [manageItem, setManageItem] = useState<CatalogRow | null>(null)
  const [textItem, setTextItem] = useState<CatalogRow | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    // Four independent reads: run them in one round trip, not four.
    const [{ data: catalog }, { data: mediaItems }, { data: counts }, { data: chunkRows }] =
      await Promise.all([
        supabase.from("memorization_catalog").select("*").order("category").order("title"),
        // Memorization items that live in the media library
        supabase
          .from("media_library")
          .select("*")
          .eq("type", "memorization")
          .order("category")
          .order("title"),
        // Assignment counts
        supabase.from("student_memorization").select("catalog_id"),
        // Chunk (part) counts so rows can show "N parts"
        supabase.from("memorization_chunks").select("catalog_id"),
      ])

    const countMap: Record<string, number> = {}
    ;((counts as { catalog_id: string }[]) || []).forEach((c) => {
      countMap[c.catalog_id] = (countMap[c.catalog_id] || 0) + 1
    })

    const chunkMap: Record<string, number> = {}
    ;((chunkRows as { catalog_id: string }[]) || []).forEach((c) => {
      chunkMap[c.catalog_id] = (chunkMap[c.catalog_id] || 0) + 1
    })
    setChunkCounts(chunkMap)

    // Map catalog items
    const catalogItems: CatalogRow[] = (catalog || []).map((item) => ({
      ...item,
      source: "catalog" as const,
      assignment_count: countMap[item.id] || 0,
    }))

    // Map media library items (avoid duplicates by title+category)
    const existingKeys = new Set(
      catalogItems.map((i) => `${i.title.toLowerCase()}|${i.category.toLowerCase()}`),
    )
    const mediaAsCatalog: CatalogRow[] = (mediaItems || [])
      .filter((m) => !existingKeys.has(`${m.title.toLowerCase()}|${m.category.toLowerCase()}`))
      .map((m) => ({
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

  async function addItem() {
    if (!newTitle.trim()) return
    setAdding(true)

    const { data, error } = await supabase
      .from("memorization_catalog")
      .insert({ title: newTitle.trim(), category: newCategory })
      .select("id")
      .single()
    if (error) {
      toast.error(
        error.code === "23505" ? "This item already exists in the catalog." : error.message,
      )
      setAdding(false)
      return
    }

    const addedTitle = newTitle.trim()
    let partsCount = 0
    if (splitParts(newText).length > 0) {
      try {
        partsCount = await saveItemText(data.id, null, newText)
      } catch (e) {
        toast.error(`Added, but the cards couldn't be drawn: ${(e as Error).message}`)
      }
    }

    setNewTitle("")
    setNewText("")
    setAdding(false)
    await loadItems()
    toast.success(
      partsCount > 0
        ? `"${addedTitle}" added with ${partsCount} part${partsCount === 1 ? "" : "s"}`
        : `"${addedTitle}" added to catalog`,
    )
  }

  async function confirmDeleteItem() {
    if (!itemToDelete) return
    setDeleting(true)
    await removeStored(itemToDelete.image_url)
    // Remove the item's chunk images folder (rows cascade-delete via FK).
    const { data: chunkFiles } = await supabase.storage
      .from("memorization-images")
      .list(`chunks/${itemToDelete.id}`)
    if (chunkFiles && chunkFiles.length > 0) {
      await supabase.storage
        .from("memorization-images")
        .remove(chunkFiles.map((f) => `chunks/${itemToDelete.id}/${f.name}`))
    }
    await supabase.from("memorization_catalog").delete().eq("id", itemToDelete.id)
    const title = itemToDelete.title
    setItemToDelete(null)
    setDeleting(false)
    await loadItems()
    toast.success(`"${title}" deleted`)
  }

  async function changeCategory(item: CatalogRow, category: string) {
    if (category === item.category) return
    const table = item.source === "media" ? "media_library" : "memorization_catalog"
    const { error } = await supabase.from(table).update({ category }).eq("id", item.id)
    if (error) {
      toast.error(`Couldn't change category: ${error.message}`)
      return
    }
    await loadItems()
    toast.success(`"${item.title}" moved to ${category}`)
  }

  const filtered = items.filter((item) => {
    const matchesCat = filterCat === "All" || item.category === filterCat
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const grouped: Record<string, CatalogRow[]> = {}
  filtered.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  if (loading) return <PageLoading variant="stacked" count={3} />

  const newPartCount = splitParts(newText).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Memorization</h1>
        <p className="text-sm leading-5 text-text-tertiary">
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
              placeholder="Surah Baqarah, Dua for rain…"
              className="flex-1"
            />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addItem} disabled={adding || !newTitle.trim()}>
              {adding ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {newPartCount > 0 ? `Add with ${newPartCount} parts` : "Add"}
            </Button>
          </div>
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            dir="rtl"
            rows={3}
            placeholder="Arabic text, one line per part (optional)"
            className="font-arabic text-xl leading-9"
          />
          <p className="text-xs text-text-tertiary">
            Each line becomes a part kids memorize one at a time. The app draws the cards for you.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-tertiary" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-background-gray-secondary p-1">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCat === c
                  ? "bg-card-background text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Preview modal (images and PDFs) */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[85vh] p-2 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {previewUrl.toLowerCase().endsWith(".pdf") || previewUrl.includes("/pdf") ? (
              <div className="overflow-hidden rounded-xl border border-card-border bg-card-background shadow-3xl">
                <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
                  <span className="text-sm font-medium text-text-primary">PDF Preview</span>
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-icon-secondary hover:bg-background-gray-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  src={previewUrl}
                  className="w-full rounded-b-xl"
                  style={{ height: "75vh" }}
                />
              </div>
            ) : (
              <>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto"
                />
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-card-border bg-card-background text-text-primary hover:bg-background-gray-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Catalog rows */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
              <BookMarked className="h-6 w-6 text-icon-secondary" />
            </div>
            <p className="mb-1 font-medium text-text-primary">No items found</p>
            <p className="text-sm text-text-tertiary">
              Add memorization items above or adjust your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-background-gray-secondary text-text-secondary border-0">
                {category}
              </Badge>
              <span className="text-sm text-text-tertiary">{catItems.length} items</span>
            </div>
            <div className="divide-y divide-border-primary overflow-hidden rounded-xl border border-card-border bg-card-background">
              {catItems.map((item) => {
                const isMedia = item.source === "media"
                const palette = paletteFor(item.id)
                const parts = chunkCounts[item.id] || 0
                const students = item.assignment_count || 0
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    {/* Thumbnail */}
                    <button
                      type="button"
                      onClick={() =>
                        item.image_url || item.file_url
                          ? setPreviewUrl(item.image_url || item.file_url || null)
                          : !isMedia && setTextItem(item)
                      }
                      className="flex h-12 w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
                      style={{ background: palette.bg, color: palette.ink }}
                      aria-label={`Open ${item.title}`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookMarked className="h-5 w-5 opacity-60" />
                      )}
                    </button>

                    {/* Title + counts */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {item.title}
                        {isMedia && (
                          <span className="ml-2 rounded-md bg-background-gray-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                            Media Library
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-3 text-xs text-text-tertiary">
                        {!isMedia && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {parts ? `${parts} part${parts > 1 ? "s" : ""}` : "No parts"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {students
                            ? `${students} student${students > 1 ? "s" : ""}`
                            : "Not assigned"}
                        </span>
                        {!isMedia && !item.arabic_text && item.image_url && (
                          <span className="hidden sm:inline">Old picture card</span>
                        )}
                      </p>
                    </div>

                    <Select value={item.category} onValueChange={(v) => changeCategory(item, v)}>
                      <SelectTrigger
                        className="hidden h-7 w-auto gap-1 border-0 bg-background-gray-secondary px-2 text-[11px] font-medium text-text-secondary shadow-none sm:flex"
                        aria-label={`Category for ${item.title}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set([...CATEGORIES, item.category])].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Actions */}
                    {isMedia ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => setPreviewUrl(item.file_url || item.image_url || null)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => setTextItem(item)}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          {item.arabic_text ? "Text" : "Add text"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setManageItem(item)}
                          title="Parts"
                          aria-label={`Parts of ${item.title}`}
                        >
                          <Layers className="h-4 w-4" />
                        </Button>
                        <Popover.Root
                          open={itemToDelete?.id === item.id}
                          onOpenChange={(open) => setItemToDelete(open ? item : null)}
                        >
                          <Popover.Trigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-icon-tertiary hover:text-destructive"
                              title="Delete"
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Popover.Trigger>
                          <Popover.Portal>
                            <Popover.Content
                              side="top"
                              align="end"
                              sideOffset={8}
                              className="z-50 w-56 rounded-lg border border-card-border bg-card-background p-3 shadow-3xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                            >
                              <p className="mb-1 text-xs font-medium text-text-primary">
                                Delete &quot;{item.title}&quot;?
                              </p>
                              {students > 0 && (
                                <p className="mb-2 text-[11px] text-text-tertiary">
                                  Assigned to {students} student{students !== 1 ? "s" : ""}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 flex-1 text-xs"
                                  onClick={() => setItemToDelete(null)}
                                  disabled={deleting}
                                >
                                  No
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 flex-1 text-xs bg-destructive hover:bg-destructive/90 text-white"
                                  onClick={confirmDeleteItem}
                                  disabled={deleting}
                                >
                                  {deleting ? "..." : "Yes"}
                                </Button>
                              </div>
                              <Popover.Arrow className="fill-card-background" />
                            </Popover.Content>
                          </Popover.Portal>
                        </Popover.Root>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Write the text (cards are drawn from it) */}
      <Dialog open={!!textItem} onOpenChange={(open) => !open && setTextItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Text — {textItem?.title}</DialogTitle>
            <DialogDescription>
              Write the Arabic, one line per part. The cover shows all of it.
            </DialogDescription>
          </DialogHeader>
          {textItem && (
            <TextEditor
              item={textItem}
              partCount={chunkCounts[textItem.id] || 0}
              onSaved={async () => {
                setTextItem(null)
                await loadItems()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage parts (chunks) */}
      <Dialog open={!!manageItem} onOpenChange={(open) => !open && setManageItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parts — {manageItem?.title}</DialogTitle>
            <DialogDescription>
              Break this into ordered pieces students memorize one at a time. A student only shows
              as fully memorized once every part is done.
            </DialogDescription>
          </DialogHeader>
          {manageItem && (
            <ChunkManager
              item={manageItem}
              onChanged={(count) => setChunkCounts((prev) => ({ ...prev, [manageItem.id]: count }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TextEditor({
  item,
  partCount,
  onSaved,
}: {
  item: CatalogRow
  partCount: number
  onSaved: () => void
}) {
  const [text, setText] = useState(item.arabic_text || "")
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const lines = splitParts(text)

  // Live preview of the first part's card, repainted shortly after typing stops.
  useEffect(() => {
    const first = lines[0]
    if (!first) {
      setPreview(null)
      return
    }
    let url: string | null = null
    let cancelled = false
    const t = setTimeout(async () => {
      const blob = await paintMemCard(first, paletteFor(item.id)).catch(() => null)
      if (!blob || cancelled) return
      url = URL.createObjectURL(blob)
      setPreview(url)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (url) URL.revokeObjectURL(url)
    }
    // lines is derived from text; text is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, item.id])

  async function save() {
    setSaving(true)
    try {
      const n = await saveItemText(item.id, item.image_url, text, (done, total) =>
        setProgress({ done, total }),
      )
      toast.success(`"${item.title}" saved with ${n} part${n === 1 ? "" : "s"}`)
      onSaved()
    } catch (e) {
      toast.error(`Couldn't save: ${(e as Error).message}`)
    }
    setSaving(false)
  }

  const removing = partCount - lines.length

  return (
    <div className="space-y-4 pt-1">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="rtl"
        rows={8}
        placeholder="بِسْمِ اللَّهِ"
        className="font-arabic text-2xl leading-[2.6rem]"
        autoFocus
      />
      {preview && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-tertiary">
            Part 1 will look like this
          </p>
          <img
            src={preview}
            alt="Part 1 preview"
            className="w-56 rounded-lg border border-card-border"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-tertiary">
          {lines.length} part{lines.length === 1 ? "" : "s"}
          {partCount > 0 && removing <= 0 && " · existing parts are redrawn, progress is kept"}
          {removing > 0 && (
            <span className="text-destructive">
              {" "}
              · removes the last {removing} part{removing === 1 ? "" : "s"} and their progress
            </span>
          )}
        </p>
        <Button onClick={save} disabled={saving || lines.length === 0} className="gap-1.5">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? `Drawing ${progress.done} of ${progress.total}…` : "Save and draw cards"}
        </Button>
      </div>
    </div>
  )
}

function ChunkManager({
  item,
  onChanged,
}: {
  item: CatalogRow
  onChanged: (count: number) => void
}) {
  const [chunks, setChunks] = useState<MemChunk[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const load = useCallback(async () => {
    const map = await loadChunksFor([item.id])
    const list = map[item.id] || []
    setChunks(list)
    setLoading(false)
    onChanged(list.length)
    // onChanged is a stable-enough setter wrapper; excluding it avoids a reload loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  useEffect(() => {
    load()
  }, [load])

  async function addFiles(fileList: FileList | File[]) {
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"))
    if (images.length === 0) {
      toast.error("Drop image files only (PNG, JPG, WebP…)")
      return
    }
    setUploading(true)
    setUploadProgress({ done: 0, total: images.length })
    const startIndex = chunks.length > 0 ? Math.max(...chunks.map((c) => c.order_index)) + 1 : 0
    const added = await uploadChunkImages(item.id, images, startIndex, (done, total) =>
      setUploadProgress({ done, total }),
    )
    if (added > 0) toast.success(`Added ${added} part${added > 1 ? "s" : ""}`)
    setUploading(false)
    setUploadProgress({ done: 0, total: 0 })
    await load()
  }

  async function remove(chunk: MemChunk) {
    const { error } = await supabase.from("memorization_chunks").delete().eq("id", chunk.id)
    if (error) {
      toast.error(error.message)
      return
    }
    const path = chunk.image_url.split("/memorization-images/").pop()
    if (path) await supabase.storage.from("memorization-images").remove([path])
    await load()
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    setDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setDragging(false)
    if (uploading) return
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const pct =
    uploadProgress.total > 0 ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0

  return (
    <div className="space-y-4 pt-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          if (inputRef.current) inputRef.current.value = ""
        }}
      />

      {/* Drop zone */}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative w-full overflow-hidden rounded-xl border border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          dragging
            ? "border-primary bg-primary/10"
            : uploading
              ? "cursor-wait border-card-border bg-background-gray-primary"
              : "border-card-border bg-background-gray-primary hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
            dragging
              ? "bg-primary text-primary-foreground"
              : "bg-[rgba(87,80,241,0.10)] text-[#5750F1]"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : dragging ? (
            <Upload className="h-5 w-5" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </div>
        {uploading ? (
          <>
            <p className="text-sm font-medium text-text-primary">
              Uploading {uploadProgress.done} of {uploadProgress.total}…
            </p>
            <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-background-gray-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : dragging ? (
          <p className="text-sm font-medium text-primary">Drop images to add as parts</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary">
              Drag &amp; drop part images here
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              or click to browse · PNG, JPG, WebP · order matters
            </p>
          </>
        )}
      </button>

      {/* Parts grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer aspect-[3/2] rounded-xl" />
          ))}
        </div>
      ) : chunks.length === 0 ? (
        <div className="rounded-lg border border-card-border px-4 py-6 text-center">
          <Layers className="mx-auto mb-2 h-6 w-6 text-icon-tertiary" />
          <p className="text-xs text-text-tertiary">
            No parts yet — upload the first chunk above (e.g. the first two words).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs font-medium uppercase text-text-tertiary">
              {chunks.length} part{chunks.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-text-tertiary">Learned in this order →</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {chunks.map((c, i) => (
              <div
                key={c.id}
                className="group relative overflow-hidden rounded-lg border border-card-border bg-white transition-colors hover:border-primary/30"
              >
                <span className="absolute left-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <img
                  src={c.image_url}
                  alt={labelFor(c, i)}
                  className="aspect-[3/2] w-full object-contain p-2 pt-8"
                />
                <div className="border-t border-card-border bg-card-background px-2.5 py-1.5 text-xs font-medium text-text-primary">
                  {labelFor(c, i)}
                </div>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  title="Delete part"
                  aria-label={`Delete ${labelFor(c, i)}`}
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
