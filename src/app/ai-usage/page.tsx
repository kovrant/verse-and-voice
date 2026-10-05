"use client"

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Flame,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"
import Link from "next/link"
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
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }>
}

export default function AiUsagePage() {
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

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Resetting soon"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/60" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted/60" />
      </div>
    )
  }

  const usagePercent = data
    ? Math.min(
        100,
        Math.round(((data.requests_today || 0) / (data.daily_limit || 1500)) * 100),
      )
    : 0

  const remainingPercent = 100 - usagePercent
  const isWarning = (data?.requests_remaining ?? 1500) <= 300 && (data?.requests_remaining ?? 1500) > 50
  const isCritical = (data?.requests_remaining ?? 1500) <= 50

  // Circular gauge math for the big overview
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (remainingPercent / 100) * circumference

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in-up pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Link href="/history">
              <BookOpen className="h-3.5 w-3.5 text-teal-500" />
              <span>Story Studio</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Link href="/quizzes">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Quiz Studio</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsage(true)}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <a
            href="https://aistudio.google.com/app/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <span>Google AI Studio</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-amber-500/10 via-card to-teal-500/10 p-6 sm:p-8 space-y-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Google Gemini AI Quota & Tokens
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                    data?.configured
                      ? "bg-teal-500/10 text-teal-400 border-teal-500/40"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/40",
                  )}
                >
                  {data?.configured && (
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                  )}
                  {data?.configured ? "CONNECTED" : "OFFLINE"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                Model: <strong className="text-foreground">{data?.model || "gemini-3.5-flash"}</strong> ·{" "}
                {data?.tier || "Free Tier (1,500 RPD / 15 RPM)"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-muted-foreground">
              Daily quota resets in:
            </span>
            <p className="font-heading text-xl font-bold text-foreground">
              {formatCountdown(data?.reset_in_seconds ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground/80">(Midnight Pacific Time / 12:00 PM PKT)</p>
          </div>
        </div>

        {/* Warning Banner if quota is running low */}
        {isCritical && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold">Daily Gemini Quota Almost Exhausted!</p>
              <p className="text-[11px] text-rose-300/80">
                You have {data?.requests_remaining} calls left today. Offline backup templates will automatically activate if quota is fully reached.
              </p>
            </div>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">High AI Usage Today</p>
              <p className="text-[11px] text-amber-300/80">
                You have used {usagePercent}% of your daily free requests ({data?.requests_remaining} remaining). Quota resets at midnight Pacific Time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Daily Requests */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daily Requests
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                {data?.requests_remaining.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                / {data?.daily_limit.toLocaleString()} RPD
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                style={{ width: `${Math.max(2, remainingPercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {data?.requests_today ?? 0} calls used today ({usagePercent}%)
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Tokens Today */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tokens Today
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl sm:text-3xl font-black text-foreground">
              {(data?.tokens_today ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Generated across stories & quests
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Month Tokens */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Month Tokens
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <Flame className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl sm:text-3xl font-black text-foreground">
              {(data?.tokens_this_month ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Monthly cumulative consumption
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Rate Limit */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rate Limit
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Cpu className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                {data?.rpm_limit || 15}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">RPM</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Max 15 requests per minute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deep-Dive Overview & Gauge */}
      <Card className="border-border/80 shadow-soft overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Daily Allowance Gauge & Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative flex items-center justify-center">
                <svg width="120" height="120" className="transform -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="currentColor"
                    className="text-muted/30"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="currentColor"
                    className={cn(
                      "transition-all duration-700 ease-out",
                      isCritical
                        ? "text-rose-500"
                        : isWarning
                          ? "text-amber-500"
                          : "text-teal-500",
                    )}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-heading text-xl font-black text-foreground">
                    {remainingPercent}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Remaining
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground mt-3 text-center">
                {data?.requests_remaining.toLocaleString()} of {data?.daily_limit.toLocaleString()} calls free
              </p>
            </div>

            {/* Explanation Column */}
            <div className="md:col-span-2 space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">How Google Gemini Quota Works</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Google Gemini 2.0 / 3.5 provides a free allowance of <strong>1,500 daily requests (RPD)</strong> and <strong>15 requests per minute (RPM)</strong>. Every time you generate an Islamic History story or derived quest quiz, tokens and calls are deducted from this free pool.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Automatic Midnight Reset</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    The 1,500 counter resets automatically every day at 00:00 Pacific Time (12:00 PM PKT).
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                    <span>Zero-Downtime Offline Fallback</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    If internet drops or the daily limit is ever reached, built-in offline templates seamlessly craft authentic stories so teaching never stops.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Log Table */}
      <Card className="border-border/80 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent AI Generation Activity Logs
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">
            {data?.recent_logs?.length || 0} recent record(s)
          </span>
        </CardHeader>
        <CardContent>
          {!data?.recent_logs || data.recent_logs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No recent AI generations logged yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Whenever you generate a new Islamic story or story quest quiz, the detailed tokens and execution metrics will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground font-semibold">
                    <th className="pb-2.5 pl-2">Time</th>
                    <th className="pb-2.5">Topic / Activity</th>
                    <th className="pb-2.5">Model</th>
                    <th className="pb-2.5">Tokens</th>
                    <th className="pb-2.5 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.recent_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 font-medium text-foreground max-w-xs truncate">
                        {log.topic || "Story & Quest Generation"}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {log.model || "gemini-3.5-flash"}
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-foreground">
                        {(log.total_tokens || log.tokens || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-2">
                        <Badge
                          variant={log.status === "success" ? "default" : "warning"}
                          className="text-[10px] py-0 font-bold"
                        >
                          {log.status === "success" ? "Success" : log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data?.table_ready === false && (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
              <HelpCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Permanent Log Storage:</span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  To persist every API call log across server restarts, execute <code className="font-mono bg-black/30 px-1 py-0.5 rounded text-[10px]">supabase/migration_ai_usage_logs.sql</code> in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
