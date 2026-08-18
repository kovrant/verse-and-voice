"use client"

import { ChevronLeft, ChevronRight, FileText, Search, SpellCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoading } from "@/components/page-loading"
import { Input } from "@/components/ui/input"
import { type QaidaItem } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"

export default function QaidaPage() {
  const [items, setItems] = useState<QaidaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [viewing, setViewing] = useState<QaidaItem | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("media_library")
      .select("id, title, file_url, category")
      .eq("type", "qaida")
      .order("category")
      .order("title")

    setItems((data as QaidaItem[]) || [])
    setLoading(false)
  }

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(search.toLowerCase()),
  )

  function navigate(direction: "prev" | "next") {
    if (!viewing) return
    const idx = items.findIndex((i) => i.id === viewing.id)
    if (direction === "prev" && idx > 0) setViewing(items[idx - 1])
    if (direction === "next" && idx < items.length - 1) setViewing(items[idx + 1])
  }

  const currentIdx = viewing ? items.findIndex((i) => i.id === viewing.id) : -1

  if (loading) return <PageLoading variant="grid-cards" count={3} />

  if (viewing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
            <div className="h-5 w-px bg-border" />
            <div>
              <p className="text-sm font-semibold">{viewing.title}</p>
              {viewing.category && (
                <p className="text-xs text-muted-foreground">{viewing.category}</p>
              )}
            </div>
          </div>
          {items.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("prev")}
                disabled={currentIdx <= 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {currentIdx + 1} / {items.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("next")}
                disabled={currentIdx >= items.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <iframe src={viewing.file_url} className="w-full h-full" title={viewing.title} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-foreground">Qaida</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {items.length > 0
            ? `${items.length} Qaida ${items.length === 1 ? "book" : "books"} uploaded`
            : "Upload Qaida PDFs from the Media Library"}
        </p>
      </div>

      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <SpellCheck className="h-7 w-7 text-muted-foreground" />
            </div>
            {items.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-1">No Qaida uploaded yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Go to Media Library and upload a Qaida PDF (Noorani, Baghdadi, Madani, etc.)
                </p>
                <Button variant="outline" onClick={() => (window.location.href = "/media")}>
                  Go to Media Library
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No Qaida matches your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setViewing(item)}
              className="group relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden text-left hover:border-border hover:bg-secondary transition-all"
            >
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-secondary/50 p-6">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                {item.category && (
                  <Badge className="bg-secondary text-muted-foreground border-0 text-[10px]">
                    {item.category}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                  Open PDF ↗
                </p>
              </div>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ring-1 ring-inset ring-border" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
