"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function ScrollColumn({
  items,
  selected,
  onSelect,
  width,
}: {
  items: string[]
  selected: string
  onSelect: (val: string) => void
  width?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const itemHeight = 44
  const visibleItems = 3
  const containerHeight = itemHeight * visibleItems
  const paddingHeight = itemHeight // one item padding top and bottom

  const selectedIndex = items.indexOf(selected)

  // Scroll to selected item when selection changes (from arrows or clicks)
  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0 && !isScrollingRef.current) {
      containerRef.current.scrollTo({
        top: selectedIndex * itemHeight,
        behavior: "smooth",
      })
    }
  }, [selectedIndex, itemHeight])

  // Handle scroll -> update selection after scroll settles
  const handleScroll = useCallback(() => {
    isScrollingRef.current = true
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clamped = Math.max(0, Math.min(index, items.length - 1))

      // Snap to nearest item
      containerRef.current.scrollTo({
        top: clamped * itemHeight,
        behavior: "smooth",
      })

      if (items[clamped] !== selected) {
        onSelect(items[clamped])
      }

      // Allow useEffect scrolling again after a delay
      setTimeout(() => {
        isScrollingRef.current = false
      }, 100)
    }, 80)
  }, [items, selected, onSelect, itemHeight])

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const nudge = useCallback((dir: -1 | 1) => {
    const i = items.indexOf(selected)
    const next = i + dir
    if (next >= 0 && next < items.length) {
      isScrollingRef.current = false // allow useEffect to scroll
      onSelect(items[next])
    }
  }, [items, selected, onSelect])

  const handleItemClick = useCallback((item: string) => {
    isScrollingRef.current = false
    onSelect(item)
  }, [onSelect])

  return (
    <div className={cn("flex flex-col items-center gap-1", width)}>
      <button
        type="button"
        onClick={() => nudge(-1)}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          selectedIndex <= 0
            ? "text-muted-foreground/20 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95"
        )}
        disabled={selectedIndex <= 0}
      >
        <ChevronUp className="h-4 w-4" />
      </button>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative overflow-y-auto"
        style={{
          height: containerHeight,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "y mandatory",
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingHeight }} />

        {items.map((item, i) => {
          const isSelected = item === selected
          const distance = Math.abs(i - selectedIndex)

          return (
            <button
              key={item}
              type="button"
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center justify-center w-full transition-all duration-200",
                isSelected
                  ? "text-emerald-400 font-bold text-xl"
                  : distance === 1
                    ? "text-muted-foreground/60 text-base"
                    : "text-muted-foreground/25 text-sm"
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: "center",
                transform: isSelected ? "scale(1.15)" : "scale(1)",
              }}
            >
              {item}
            </button>
          )
        })}

        {/* Bottom padding */}
        <div style={{ height: paddingHeight }} />
      </div>

      <button
        type="button"
        onClick={() => nudge(1)}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          selectedIndex >= items.length - 1
            ? "text-muted-foreground/20 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95"
        )}
        disabled={selectedIndex >= items.length - 1}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  )
}

export function TimePicker({ value, onChange, placeholder }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const parsed = parseTime(value)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState(parsed.period)

  // Sync from external value
  useEffect(() => {
    const p = parseTime(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  // Emit changes
  useEffect(() => {
    if (hour && minute && period) {
      const newVal = `${hour}:${minute} ${period} PKT`
      if (newVal !== value) {
        onChange(newVal)
      }
    }
  }, [hour, minute, period])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]
  const periods = ["AM", "PM"]

  const displayValue = hour && minute && period
    ? `${hour}:${minute} ${period} PKT`
    : ""

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-11 w-full items-center gap-3 rounded-xl border border-border/50 bg-secondary/50 px-4 py-2 text-sm text-left transition-all duration-200",
          "hover:border-border hover:bg-secondary/80",
          open && "ring-2 ring-emerald-500/30 border-emerald-500/50 bg-secondary",
          !displayValue && "text-muted-foreground/60"
        )}
      >
        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1">{displayValue || placeholder || "Select time"}</span>
        {displayValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
              setHour("8")
              setMinute("00")
              setPeriod("AM")
            }}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <span className="text-xs">Clear</span>
          </button>
        )}
      </button>

      {/* Dropdown picker */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/20 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Time</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              {hour || "--"}:{minute || "--"} {period || "--"}{" "}
              <span className="text-xs text-muted-foreground font-normal">PKT</span>
            </p>
          </div>

          {/* Scroll columns */}
          <div className="relative flex items-center justify-center gap-0 py-2 px-2">
            {/* Selection highlight bar */}
            <div className="absolute inset-x-3 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)" }}>
              <div
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5"
                style={{ height: 44 }}
              />
            </div>

            <ScrollColumn
              items={hours}
              selected={hour}
              onSelect={setHour}
              width="flex-1"
            />

            <div className="text-2xl font-bold text-muted-foreground/30 self-center">:</div>

            <ScrollColumn
              items={minutes}
              selected={minute}
              onSelect={setMinute}
              width="flex-1"
            />

            <div className="w-px h-16 bg-border/50 mx-2 self-center" />

            <ScrollColumn
              items={periods}
              selected={period}
              onSelect={setPeriod}
              width="w-16"
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function parseTime(val: string): { hour: string; minute: string; period: string } {
  if (!val) return { hour: "8", minute: "00", period: "AM" }
  const match = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (match) {
    return { hour: match[1], minute: match[2], period: match[3].toUpperCase() }
  }
  return { hour: "8", minute: "00", period: "AM" }
}
