"use client"

import { format } from "date-fns"
import { BookMarked, Check, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

interface StudentMemItem {
  id: string
  catalog_id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: CatalogItem
}

export default function StudentMemorizationPage() {
  const { student, loading } = useStudent()
  const [items, setItems] = useState<StudentMemItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)

  useEffect(() => {
    if (!student) return
    supabase
      .from("student_memorization")
      .select("*, memorization_catalog(id, title, category, image_url)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as any) || [])
        setLoadingItems(false)
      })
  }, [student])

  if (loading || loadingItems) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-24 shimmer rounded-2xl" />
        <div className="h-24 shimmer rounded-2xl" />
      </div>
    )
  }

  const memorizing = items.filter((m) => m.status === "memorizing")
  const memorized = items.filter((m) => m.status === "memorized")

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/20 text-sky-600 flex-shrink-0">
          <BookMarked className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Memorization
          </h1>
          <p className="text-sm text-muted-foreground">
            Surahs, duas and more you&apos;re learning 🌙
          </p>
        </div>
      </div>

      {memorizing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Currently Memorizing
          </p>
          {memorizing.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5"
            >
              {item.memorization_catalog?.image_url && (
                <img
                  src={item.memorization_catalog.image_url}
                  alt=""
                  className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <span className="flex-1 text-sm font-medium text-amber-300">
                {item.memorization_catalog?.title}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] border-border/30 text-muted-foreground/60"
              >
                {item.memorization_catalog?.category}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {memorized.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="h-3 w-3" />
            Memorized ({memorized.length})
          </p>
          {memorized.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 px-4 py-2.5"
            >
              {item.memorization_catalog?.image_url && (
                <img
                  src={item.memorization_catalog.image_url}
                  alt=""
                  className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <span className="flex-1 text-sm text-muted-foreground">
                {item.memorization_catalog?.title}
              </span>
              {item.last_revised_at && (
                <span className="text-[10px] text-muted-foreground/60">
                  Revised {format(new Date(item.last_revised_at), "MMM d")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookMarked className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Nothing assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Your teacher will assign memorization items here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
