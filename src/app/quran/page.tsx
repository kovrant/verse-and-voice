"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search, X, ChevronLeft, ChevronRight, FileText } from "lucide-react"

interface QuranPara {
  id: string
  title: string
  category: string
  file_url: string
  file_type: string
  meta: Record<string, any>
  created_at: string
}

export default function QuranPage() {
  const [paras, setParas] = useState<QuranPara[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [viewingPara, setViewingPara] = useState<QuranPara | null>(null)

  useEffect(() => { loadParas() }, [])

  async function loadParas() {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .eq("type", "quran")
      .order("created_at", { ascending: true })

    // Sort by para number if available
    const sorted = (data || []).sort((a, b) => {
      const aNum = a.meta?.para_number || 999
      const bNum = b.meta?.para_number || 999
      return aNum - bNum
    })

    setParas(sorted)
    setLoading(false)
  }

  const filtered = paras.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.meta?.para_number && `para ${p.meta.para_number}`.includes(search.toLowerCase()))
  )

  // Navigate between paras in viewer
  function navigatePara(direction: "prev" | "next") {
    if (!viewingPara) return
    const idx = paras.findIndex(p => p.id === viewingPara.id)
    if (direction === "prev" && idx > 0) setViewingPara(paras[idx - 1])
    if (direction === "next" && idx < paras.length - 1) setViewingPara(paras[idx + 1])
  }

  const currentIdx = viewingPara ? paras.findIndex(p => p.id === viewingPara.id) : -1

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-48 shimmer rounded-lg" />
          <div className="h-5 w-72 shimmer rounded-lg" />
        </div>
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10">
          {[...Array(30)].map((_, i) => <div key={i} className="aspect-square shimmer rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // Full-screen PDF viewer
  if (viewingPara) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingPara(null)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
            <div className="h-5 w-px bg-border" />
            <div>
              <p className="text-sm font-semibold">{viewingPara.title}</p>
              {viewingPara.meta?.para_number && (
                <p className="text-xs text-muted-foreground">Para {viewingPara.meta.para_number} of 30</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePara("prev")}
              disabled={currentIdx <= 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {currentIdx + 1} / {paras.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePara("next")}
              disabled={currentIdx >= paras.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* PDF / Image viewer */}
        <div className="flex-1 overflow-auto">
          {viewingPara.file_type === "pdf" ? (
            <iframe
              src={viewingPara.file_url}
              className="w-full h-full"
              title={viewingPara.title}
            />
          ) : (
            <div className="flex items-center justify-center p-4 h-full">
              <img
                src={viewingPara.file_url}
                alt={viewingPara.title}
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Quran Paras</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {paras.length > 0
            ? `${paras.length} of 30 paras uploaded`
            : "Upload Quran paras from the Media Library"}
        </p>
      </div>

      {/* Search */}
      {paras.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search paras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
      )}

      {/* Para grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <BookOpen className="h-7 w-7 text-emerald-400" />
            </div>
            {paras.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-1">No Quran paras uploaded yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Go to Media Library to upload Quran PDFs
                </p>
                <Button variant="outline" onClick={() => window.location.href = "/media"}>
                  Go to Media Library
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No paras match your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10">
          {filtered.map(para => (
            <button
              key={para.id}
              type="button"
              onClick={() => setViewingPara(para)}
              className="group relative flex flex-col items-center rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
            >
              {/* Para number display */}
              <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 p-2">
                {para.meta?.para_number ? (
                  <>
                    <span className="text-2xl font-bold text-emerald-400">
                      {para.meta.para_number}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Para</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-6 w-6 text-emerald-400/60" />
                    <span className="text-[10px] text-muted-foreground text-center truncate w-full px-1">
                      {para.title}
                    </span>
                  </>
                )}
              </div>

              {/* Title bar */}
              <div className="w-full px-2 pb-2">
                <p className="text-[10px] text-center text-muted-foreground truncate">
                  {para.title}
                </p>
              </div>

              {/* Hover indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500/10 rounded-2xl">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                  Open
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {paras.length > 0 && paras.length < 30 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Upload progress</span>
            <span className="text-emerald-400 font-medium">{paras.length}/30 paras</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${(paras.length / 30) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
