"use client"

import { useEffect, useState } from "react"
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
import { Plus, Trash2, BookMarked, Users, Search } from "lucide-react"

interface CatalogItem {
  id: string
  title: string
  category: string
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
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    // Get catalog items with count of student assignments
    const { data: catalog } = await supabase
      .from("memorization_catalog")
      .select("*")
      .order("category")
      .order("title")

    if (catalog) {
      // Get assignment counts
      const { data: counts } = await supabase
        .from("student_memorization")
        .select("catalog_id")

      const countMap: Record<string, number> = {}
      ;(counts || []).forEach((c: any) => {
        countMap[c.catalog_id] = (countMap[c.catalog_id] || 0) + 1
      })

      setItems(catalog.map(item => ({
        ...item,
        assignment_count: countMap[item.id] || 0,
      })))
    }

    setLoading(false)
  }

  async function addItem() {
    if (!newTitle.trim()) return
    setAdding(true)
    const { error } = await supabase.from("memorization_catalog").insert({
      title: newTitle.trim(),
      category: newCategory,
    })
    if (error) {
      if (error.code === "23505") {
        alert("This item already exists in the catalog.")
      } else {
        alert("Error: " + error.message)
      }
      setAdding(false)
      return
    }
    setNewTitle("")
    setAdding(false)
    await loadItems()
  }

  async function deleteItem(id: string) {
    const item = items.find(i => i.id === id)
    if (item && (item.assignment_count || 0) > 0) {
      if (!confirm(`"${item.title}" is assigned to ${item.assignment_count} student(s). Delete anyway?`)) return
    }
    await supabase.from("memorization_catalog").delete().eq("id", id)
    await loadItems()
  }

  const filtered = items.filter(item => {
    const matchesCat = filterCat === "All" || item.category === filterCat
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Group by category
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
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Surah Baqarah, Dua for Rain..."
              onKeyDown={(e) => e.key === "Enter" && addItem()}
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
            <Button onClick={addItem} disabled={adding || !newTitle.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
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

      {/* Catalog grouped by category */}
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
            <Card key={category} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${colors.bg} ${colors.text} border-0`}>{category}</Badge>
                  <span className="text-sm text-muted-foreground">{catItems.length} items</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {catItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3 hover:bg-secondary/30 transition-colors group"
                    >
                      <BookMarked className={`h-4 w-4 ${colors.text} flex-shrink-0`} />
                      <span className="flex-1 text-sm font-medium">{item.title}</span>
                      {(item.assignment_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {item.assignment_count}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="h-7 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
