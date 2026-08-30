"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { OnlineDot } from "@/components/online-dot"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useOnlineStudents } from "@/lib/use-online-students"

export function TeacherOnlinePanel() {
  const onlineIds = useOnlineStudents()
  const ids = useMemo(() => [...onlineIds], [onlineIds])
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (ids.length === 0) {
      setNames({})
      return
    }
    let active = true
    void supabase
      .from("students")
      .select("id, name")
      .in("id", ids)
      .then(({ data }) => {
        if (!active) return
        const map: Record<string, string> = {}
        for (const row of data ?? []) map[row.id as string] = row.name as string
        setNames(map)
      })
    return () => {
      active = false
    }
  }, [ids.join(",")])

  const sorted = ids
    .map((id) => ({ id, name: names[id] ?? "…" }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Online now
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
            {ids.length}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Students with the portal open right now</p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No students online</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <OnlineDot />
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                    {s.name.charAt(0)}
                  </span>
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/class" className="block mt-3">
          <Button variant="outline" size="sm" className="w-full">
            Start a class
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
