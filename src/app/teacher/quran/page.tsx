"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image's remotePatterns + layout constraints aren't worth it for this internal admin tool */

import { BookOpen, ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    loadParas()
  }, [])

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

  const filtered = paras.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.meta?.para_number && `para ${p.meta.para_number}`.includes(search.toLowerCase())),
  )

  // Navigate between paras in viewer
  function navigatePara(direction: "prev" | "next") {
    if (!viewingPara) return
    const idx = paras.findIndex((p) => p.id === viewingPara.id)
    if (direction === "prev" && idx > 0) setViewingPara(paras[idx - 1])
    if (direction === "next" && idx < paras.length - 1) setViewingPara(paras[idx + 1])
  }

  const currentIdx = viewingPara ? paras.findIndex((p) => p.id === viewingPara.id) : -1

  if (loading) return <PageLoading variant="grid-dense" count={30} />

  // Full-screen PDF viewer
  if (viewingPara) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border-primary bg-card-background px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingPara(null)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
            <div className="h-5 w-px bg-border-primary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{viewingPara.title}</p>
              {viewingPara.meta?.para_number && (
                <p className="text-xs text-text-tertiary">
                  Para {viewingPara.meta.para_number} of 30
                </p>
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
            <span className="px-2 text-xs text-text-tertiary">
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
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Quran Paras</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          {paras.length > 0
            ? `${paras.length} of 30 paras uploaded`
            : "Upload Quran paras from the Media Library"}
        </p>
      </div>

      {/* Search */}
      {paras.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-tertiary" />
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
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
              <BookOpen className="h-6 w-6 text-icon-secondary" />
            </div>
            {paras.length === 0 ? (
              <>
                <p className="mb-1 font-medium text-text-primary">No Quran paras uploaded yet</p>
                <p className="mb-5 text-sm text-text-tertiary">
                  Go to Media Library to upload Quran PDFs
                </p>
                <Button variant="outline" onClick={() => (window.location.href = "/teacher/media")}>
                  Go to Media Library
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-tertiary">No paras match your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10">
          {filtered.map((para) => (
            <button
              key={para.id}
              type="button"
              onClick={() => setViewingPara(para)}
              className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-card-border bg-card-background transition-colors hover:bg-background-gray-primary"
            >
              {/* Para number display */}
              <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 p-2">
                {para.meta?.para_number ? (
                  <>
                    <span className="text-2xl font-semibold text-text-primary">
                      {para.meta.para_number}
                    </span>
                    <span className="text-[11px] text-text-tertiary">Para</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-6 w-6 text-icon-tertiary" />
                    <span className="w-full truncate px-1 text-center text-[11px] text-text-tertiary">
                      {para.title}
                    </span>
                  </>
                )}
              </div>

              {/* Title bar */}
              <div className="w-full px-2 pb-2">
                <p className="truncate text-center text-[11px] text-text-tertiary">{para.title}</p>
              </div>

              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[11px] font-medium uppercase text-primary">Open</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {paras.length > 0 && paras.length < 30 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Upload progress</span>
            <span className="font-medium text-text-primary">{paras.length}/30 paras</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background-gray-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(paras.length / 30) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
