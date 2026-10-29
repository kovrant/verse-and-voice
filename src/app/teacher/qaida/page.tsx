"use client"

import { ChevronLeft, ChevronRight, FileText, Search, SpellCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
        <div className="flex items-center justify-between border-b border-border-primary bg-card-background px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
            <div className="h-5 w-px bg-border-primary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{viewing.title}</p>
              {viewing.category && <p className="text-xs text-text-tertiary">{viewing.category}</p>}
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
              <span className="px-2 text-xs text-text-tertiary">
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
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Qaida</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          {items.length > 0
            ? `${items.length} Qaida ${items.length === 1 ? "book" : "books"} uploaded`
            : "Upload Qaida PDFs from the Media Library"}
        </p>
      </div>

      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-tertiary" />
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
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
              <SpellCheck className="h-6 w-6 text-icon-secondary" />
            </div>
            {items.length === 0 ? (
              <>
                <p className="mb-1 font-medium text-text-primary">No Qaida uploaded yet</p>
                <p className="mb-5 text-sm text-text-tertiary">
                  Go to Media Library and upload a Qaida PDF (Noorani, Baghdadi, Madani, etc.)
                </p>
                <Button variant="outline" onClick={() => (window.location.href = "/teacher/media")}>
                  Go to Media Library
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-tertiary">No Qaida matches your search</p>
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
              className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card-background text-left transition-colors hover:bg-background-gray-primary"
            >
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-background-gray-primary p-6">
                <FileText className="h-10 w-10 text-icon-tertiary" />
                {item.category && (
                  <Badge className="border-0 bg-background-gray-secondary text-[11px] text-text-secondary">
                    {item.category}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
                <p className="mt-1 text-xs text-text-tertiary transition-colors group-hover:text-primary">
                  Open PDF ↗
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
