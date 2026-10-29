"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { OnlineDot } from "@/components/online-dot"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useOnlineStudents } from "@/lib/use-online-students"

export function TeacherOnlinePanel() {
  const onlineIds = useOnlineStudents()
  const idsKey = [...onlineIds].sort().join(",")
  const ids = useMemo(() => (idsKey ? idsKey.split(",") : []), [idsKey])
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
  }, [ids])

  const sorted = ids
    .map((id) => ({ id, name: names[id] ?? "…" }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-semibold leading-6 tracking-[-0.2px] text-text-primary">
        Online now
        <span className="inline-flex items-center rounded-full bg-[hsl(var(--success)/0.12)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
          {ids.length}
        </span>
      </p>
      <p className="text-sm text-text-tertiary">Students with the portal open right now</p>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-tertiary">No students online</p>
      ) : (
        <ul className="mt-4">
          {sorted.map((s) => (
            <li key={s.id} className="border-b border-border-primary last:border-0">
              <Link
                href={`/teacher/students/${s.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-background-gray-primary"
              >
                <span className="relative flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-background-gray-secondary text-xs font-semibold text-text-secondary">
                  {s.name.charAt(0)}
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <OnlineDot />
                  </span>
                </span>
                <span className="truncate text-sm font-medium text-text-primary">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/teacher/class" className="mt-4 block">
        <Button variant="outline" size="sm" className="w-full">
          Start a class
        </Button>
      </Link>
    </Card>
  )
}
