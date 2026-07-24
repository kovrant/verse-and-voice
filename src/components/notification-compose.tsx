"use client"

import { Send } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

interface StudentOption {
  id: string
  name: string
}

const EMPTY = {
  target: "student" as "student" | "all",
  studentId: "",
  title: "",
  body: "",
  priority: "normal" as "low" | "normal" | "high",
}

/** Teacher-only: send an in-app notification to one student or all students. */
export function NotificationCompose() {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    void supabase
      .from("students")
      .select("id, name")
      .order("name")
      .then(({ data }) => setStudents((data as StudentOption[] | null) ?? []))
  }, [open])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error("Please add a title.")
    if (form.target === "student" && !form.studentId) return toast.error("Please choose a student.")

    setSending(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: form.target,
          student_id: form.target === "student" ? form.studentId : undefined,
          title: form.title.trim(),
          body: form.body.trim() || undefined,
          priority: form.priority,
        }),
      })
      const json = (await res.json()) as { sent?: number; error?: string }
      if (!res.ok) return toast.error(json.error || "Couldn't send the notification.")
      toast.success(json.sent && json.sent > 1 ? `Sent to ${json.sent} students.` : "Notification sent.")
      setForm(EMPTY)
      setOpen(false)
    } catch {
      toast.error("Network error — please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Send a notification"
        >
          <Send className="h-[18px] w-[18px]" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
          <DialogDescription>Delivered instantly to the student&apos;s portal.</DialogDescription>
        </DialogHeader>

        <form onSubmit={send} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select
                value={form.target}
                onValueChange={(v) => setForm({ ...form, target: v as "student" | "all" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">A student</SelectItem>
                  <SelectItem value="all">All students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target === "student" && (
              <div className="space-y-2">
                <Label>Student</Label>
                <Select
                  value={form.studentId}
                  onValueChange={(v) => setForm({ ...form, studentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-title">Title *</Label>
            <Input
              id="notif-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Class rescheduled to 5 PM"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-body">Message</Label>
            <Textarea
              id="notif-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Add more detail (optional)…"
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v as "low" | "normal" | "high" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Important</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={sending} className="min-w-[120px]">
              {sending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
