"use client"

/* eslint-disable @next/next/no-img-element */

import { ChevronDown, ChevronUp, ImagePlus, Loader2, Moon, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "@/lib/toast"

import { NamazStepCard } from "@/components/namaz-step-card"
import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  NAMAZ_CARD_COLORS,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  partsForStep,
  type NamazStep,
  type NamazStepPart,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export default function NamazAdminPage() {
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [newColor, setNewColor] = useState<string>(NAMAZ_CARD_COLORS[0])
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [partTitle, setPartTitle] = useState("")
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadStepId = useRef<string | null>(null)

  async function load() {
    const [stepsRes, partsRes] = await Promise.all([
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
    ])
    setSteps((stepsRes.data as NamazStep[]) || [])
    setParts((partsRes.data as NamazStepPart[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addStep() {
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    const order_index = steps.length
    const { error } = await supabase.from("namaz_steps").insert({
      title,
      order_index,
      card_color: newColor,
    })
    setAdding(false)
    if (error) toast.error(error.message)
    else {
      setNewTitle("")
      toast.success("Step added")
      await load()
    }
  }

  async function deleteStep(id: string) {
    const { error } = await supabase.from("namaz_steps").delete().eq("id", id)
    if (error) toast.error(error.message)
    else {
      toast.success("Step deleted")
      await load()
    }
  }

  async function moveStep(id: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === id)
    const swap = steps[idx + dir]
    if (!swap) return
    const a = steps[idx]
    await Promise.all([
      supabase.from("namaz_steps").update({ order_index: swap.order_index }).eq("id", a.id),
      supabase.from("namaz_steps").update({ order_index: a.order_index }).eq("id", swap.id),
    ])
    await load()
  }

  async function uploadImage(stepId: string, file: File) {
    setUploading(stepId)
    const ext = file.name.split(".").pop()
    const path = `namaz/${stepId}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from("memorization-images")
      .upload(path, file, { cacheControl: "3600", upsert: true })
    if (upErr) {
      toast.error(upErr.message)
      setUploading(null)
      return
    }
    const { data } = supabase.storage.from("memorization-images").getPublicUrl(path)
    const { error } = await supabase
      .from("namaz_steps")
      .update({ image_url: data.publicUrl })
      .eq("id", stepId)
    setUploading(null)
    if (error) toast.error(error.message)
    else await load()
  }

  async function addPart(stepId: string) {
    const title = partTitle.trim()
    if (!title) return
    const existing = partsForStep(stepId, parts)
    const { error } = await supabase.from("namaz_step_parts").insert({
      step_id: stepId,
      title,
      order_index: existing.length,
    })
    if (error) toast.error(error.message)
    else {
      setPartTitle("")
      toast.success("Part added")
      await load()
    }
  }

  async function deletePart(partId: string) {
    const { error } = await supabase.from("namaz_step_parts").delete().eq("id", partId)
    if (error) toast.error(error.message)
    else await load()
  }

  if (loading) return <PageLoading variant="grid-cards" count={3} />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Moon className="h-8 w-8 text-teal-600" />
          Namaz Steps
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage step cards and duas inside each step. Assign per student from their profile.
        </p>
      </div>

      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add step
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Step name e.g. Takbir"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-1">
              {NAMAZ_CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 transition-transform",
                    newColor === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button onClick={addStep} disabled={adding || !newTitle.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const stepId = uploadStepId.current
          if (file && stepId) uploadImage(stepId, file)
          e.target.value = ""
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, idx) => {
          const stepParts = partsForStep(step.id, parts)
          const open = expanded === step.id
          return (
            <div key={step.id} className="space-y-2">
              <NamazStepCard
                title={step.title}
                imageUrl={step.image_url}
                cardColor={step.card_color}
                clickable={false}
              />
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={idx === 0}
                  onClick={() => moveStep(step.id, -1)}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={idx === steps.length - 1}
                  onClick={() => moveStep(step.id, 1)}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={uploading === step.id}
                  onClick={() => {
                    uploadStepId.current = step.id
                    fileRef.current?.click()
                  }}
                >
                  {uploading === step.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3 w-3 mr-1" />
                  )}
                  Image
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setExpanded(open ? null : step.id)}
                >
                  Parts ({stepParts.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => deleteStep(step.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {open && (
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
                  {stepParts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.title}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-destructive"
                        onClick={() => deletePart(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Part e.g. Atahiyatu"
                      value={partTitle}
                      onChange={(e) => setPartTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8" onClick={() => addPart(step.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
