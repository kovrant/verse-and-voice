"use client"

import {
  Activity,
  AlertCircle,
  ExternalLink,
  Flame,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface GeminiUsageData {
  configured: boolean
  table_ready?: boolean
  model?: string
  tier?: string
  daily_limit: number
  rpm_limit?: number
  requests_today: number
  requests_remaining: number
  requests_this_month?: number
  tokens_today: number
  tokens_this_month: number
  reset_in_seconds: number
  notice?: string
  recent_logs?: Array<{
    id: string
    created_at: string
    topic: string
    tokens: number
    status: string
    model?: string
  }>
}

interface GeminiQuotaCardProps {
  className?: string
  /**
   * "compact" fits neatly inside modals like AI Generator;
   * "full" provides the rich dashboard overview.
   */
  variant?: "full" | "compact"
}

export function GeminiQuotaCard({ className, variant = "full" }: GeminiQuotaCardProps) {
  const [data, setData] = useState<GeminiUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUsage = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/ai/usage")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("Failed to load Gemini quota:", err)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsage()
  }, [fetchUsage])

  // Format countdown seconds into "Xh Ym"
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Resetting soon"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card/60 p-4 animate-pulse", className)}>
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Checking Gemini quota...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const usagePercent = Math.min(
    100,
    Math.round(((data.requests_today || 0) / (data.daily_limit || 1500)) * 100),
  )

  // Status color helpers based on remaining quota
  const isWarning = data.requests_remaining <= 200 && data.requests_remaining > 50
  const isCritical = data.requests_remaining <= 50

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/80 bg-muted/30 p-3 text-xs shadow-2xs space-y-2",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="font-bold truncate text-foreground">
              Gemini AI Daily Quota
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {data.configured ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                <AlertCircle className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>
              <strong className="text-foreground font-black">{data.requests_remaining.toLocaleString()}</strong> of{" "}
              {data.daily_limit.toLocaleString()} remaining
            </span>
            <span>{usagePercent}% used</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCritical
                  ? "bg-rose-500"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400",
              )}
              style={{ width: `${Math.max(2, usagePercent)}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("border border-border/80 shadow-soft overflow-hidden", className)}>
      <CardHeader className="pb-3.5 pt-4 px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 text-amber-500 shadow-xs">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                  Google Gemini AI Quota
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0 border",
                    data.configured
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  )}
                >
                  {data.configured ? "Connected" : "Offline"}
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Model: <span className="font-semibold text-foreground/90">{data.model || "gemini-2.0-flash"}</span> ·{" "}
                {data.tier || "Free Tier (1,500 RPD)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchUsage(true)}
              disabled={refreshing}
              title="Refresh Quota"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
            <a
              href="https://aistudio.google.com/app/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground border border-border/80 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/40"
            >
              <span>AI Studio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-4 space-y-4">
        {/* Main Progress Metric */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Daily Requests Remaining
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-black text-foreground">
                  {data.requests_remaining.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  / {data.daily_limit.toLocaleString()} RPD
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-medium text-muted-foreground">
                Resets in: <strong className="text-foreground">{formatCountdown(data.reset_in_seconds)}</strong>
              </span>
              <p className="text-[10px] text-muted-foreground/80">(Midnight Pacific Time)</p>
            </div>
          </div>

          {/* Quota Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/80">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isCritical
                  ? "bg-rose-500"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300",
              )}
              style={{ width: `${Math.max(2, usagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
            <span>Used today: <strong className="text-foreground">{data.requests_today}</strong> calls</span>
            <span>{usagePercent}% of daily allowance</span>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Tokens Today */}
          <div className="rounded-xl border border-border/60 bg-muted/15 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Tokens Today</span>
            </div>
            <p className="font-heading text-base font-bold text-foreground mt-1">
              {data.tokens_today.toLocaleString()}
            </p>
          </div>

          {/* Tokens Month */}
          <div className="rounded-xl border border-border/60 bg-muted/15 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Month Tokens</span>
            </div>
            <p className="font-heading text-base font-bold text-foreground mt-1">
              {data.tokens_this_month.toLocaleString()}
            </p>
          </div>

          {/* Rate Limit */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/60 bg-muted/15 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Rate Limit</span>
            </div>
            <p className="font-heading text-base font-bold text-foreground mt-1">
              {data.rpm_limit || 15} <span className="text-xs font-normal text-muted-foreground">RPM</span>
            </p>
          </div>
        </div>

        {/* Database setup notice if table is pending */}
        {data.table_ready === false && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold">Persistent Quota Logging:</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Run <code className="font-mono bg-black/30 px-1 py-0.5 rounded text-[10px]">supabase/migration_ai_usage_logs.sql</code> in the Supabase SQL Editor to save request logs permanently.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
