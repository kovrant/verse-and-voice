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
            <div key={i} className="h-28 rounded-xl bg-muted/60" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/60" />
      </div>
    )
  }

  const usagePercent = data
    ? Math.min(100, Math.round(((data.requests_today || 0) / (data.daily_limit || 1500)) * 100))
    : 0

  const remainingPercent = 100 - usagePercent
  const isWarning =
    (data?.requests_remaining ?? 1500) <= 300 && (data?.requests_remaining ?? 1500) > 50
  const isCritical = (data?.requests_remaining ?? 1500) <= 50

  // Circular gauge math for the big overview
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (remainingPercent / 100) * circumference

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in-up pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-text-secondary hover:text-text-primary"
        >
          <Link href="/teacher">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-medium">
            <Link href="/teacher/history">
              <BookOpen className="h-3.5 w-3.5 text-[#0EA5E9]" />
              <span>Story Studio</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-medium">
            <Link href="/teacher/quizzes">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Quiz Studio</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsage(true)}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <a
            href="https://aistudio.google.com/app/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-card-border rounded-lg shadow-xs hover:bg-background-gray-primary transition-colors text-text-primary"
          >
            <span>Google AI Studio</span>
            <ExternalLink className="h-3 w-3 text-icon-tertiary" />
          </a>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="rounded-xl border border-card-border bg-card-background p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">
                  Google Gemini AI Quota & Tokens
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-medium uppercase px-2.5 py-0.5 rounded-full border",
                    data?.configured
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30",
                  )}
                >
                  {data?.configured && (
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                  {data?.configured ? "CONNECTED" : "OFFLINE"}
                </Badge>
              </div>
              <p className="text-sm leading-5 text-text-tertiary">
                Model:{" "}
                <strong className="font-medium text-text-primary">
                  {data?.model || "gemini-3.5-flash"}
                </strong>{" "}
                · {data?.tier || "Free Tier (1,500 RPD / 15 RPM)"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-text-tertiary">Daily quota resets in:</span>
            <p className="text-xl font-semibold text-text-primary">
              {formatCountdown(data?.reset_in_seconds ?? 0)}
            </p>
            <p className="text-[11px] text-text-tertiary">(Midnight Pacific Time / 12:00 PM PKT)</p>
          </div>
        </div>

        {/* Warning Banner if quota is running low */}
        {isCritical && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Daily Gemini Quota Almost Exhausted!</p>
              <p className="text-xs opacity-80">
                You have {data?.requests_remaining} calls left today. Offline backup templates will
                automatically activate if quota is fully reached.
              </p>
            </div>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold">High AI Usage Today</p>
              <p className="text-xs opacity-80">
                You have used {usagePercent}% of your daily free requests (
                {data?.requests_remaining} remaining). Quota resets at midnight Pacific Time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Daily Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-tertiary">Daily Requests</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-text-primary">
                {data?.requests_remaining.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-text-tertiary">
                / {data?.daily_limit.toLocaleString()} RPD
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-gray-secondary">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.max(2, remainingPercent)}%` }}
              />
            </div>
            <p className="text-xs text-text-tertiary mt-1.5">
              {data?.requests_today ?? 0} calls used today ({usagePercent}%)
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Tokens Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-tertiary">Tokens Today</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.10)] text-[#F97316]">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-text-primary">
              {(data?.tokens_today ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-text-tertiary mt-2">Generated across stories & quests</p>
          </CardContent>
        </Card>

        {/* Card 3: Month Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-tertiary">Month Tokens</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.10)] text-[#A855F7]">
              <Flame className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-text-primary">
              {(data?.tokens_this_month ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-text-tertiary mt-2">Monthly cumulative consumption</p>
          </CardContent>
        </Card>

        {/* Card 4: Rate Limit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-tertiary">Rate Limit</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(87,80,241,0.10)] text-[#5750F1]">
              <Cpu className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-text-primary">
                {data?.rpm_limit || 15}
              </span>
              <span className="text-xs font-medium text-text-tertiary">RPM</span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">Max 15 requests per minute</p>
          </CardContent>
        </Card>
      </div>

      {/* Deep-Dive Overview & Gauge */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            <Sparkles className="h-4 w-4 text-[#F97316]" />
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
                    className="text-background-gray-secondary"
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
                          : "text-green-500",
                    )}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-semibold text-text-primary">
                    {remainingPercent}%
                  </span>
                  <span className="text-[11px] font-medium uppercase text-text-tertiary">
                    Remaining
                  </span>
                </div>
              </div>
              <p className="text-xs font-medium text-text-tertiary mt-3 text-center">
                {data?.requests_remaining.toLocaleString()} of {data?.daily_limit.toLocaleString()}{" "}
                calls free
              </p>
            </div>

            {/* Explanation Column */}
            <div className="md:col-span-2 space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  How Google Gemini Quota Works
                </h3>
                <p className="text-sm text-text-tertiary leading-relaxed">
                  Google Gemini 2.0 / 3.5 provides a free allowance of{" "}
                  <strong>1,500 daily requests (RPD)</strong> and{" "}
                  <strong>15 requests per minute (RPM)</strong>. Every time you generate an Islamic
                  History story or derived quest quiz, tokens and calls are deducted from this free
                  pool.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg border border-card-border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Automatic Midnight Reset</span>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    The 1,500 counter resets automatically every day at 00:00 Pacific Time (12:00 PM
                    PKT).
                  </p>
                </div>

                <div className="rounded-lg border border-card-border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Zero-Downtime Offline Fallback</span>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    If internet drops or the daily limit is ever reached, built-in offline templates
                    seamlessly craft authentic stories so teaching never stops.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Log Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            <Clock className="h-4 w-4 text-icon-secondary" />
            Recent AI Generation Activity Logs
          </CardTitle>
          <span className="text-sm text-text-tertiary">
            {data?.recent_logs?.length || 0} recent record(s)
          </span>
        </CardHeader>
        <CardContent>
          {!data?.recent_logs || data.recent_logs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary text-icon-secondary">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="font-medium text-text-primary">No recent AI generations logged yet</p>
              <p className="text-sm text-text-tertiary max-w-sm mx-auto">
                Whenever you generate a new Islamic story or story quest quiz, the detailed tokens
                and execution metrics will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-primary text-xs font-medium uppercase text-text-tertiary">
                    <th className="pb-2.5 pl-2">Time</th>
                    <th className="pb-2.5">Topic / Activity</th>
                    <th className="pb-2.5">Model</th>
                    <th className="pb-2.5">Tokens</th>
                    <th className="pb-2.5 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary">
                  {data.recent_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-background-gray-primary transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-text-tertiary">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 font-medium text-text-primary max-w-xs truncate">
                        {log.topic || "Story & Quest Generation"}
                      </td>
                      <td className="py-2.5 text-text-tertiary">
                        {log.model || "gemini-3.5-flash"}
                      </td>
                      <td className="py-2.5 font-mono font-medium text-text-primary">
                        {(log.total_tokens || log.tokens || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-2">
                        <Badge
                          variant={log.status === "success" ? "success" : "warning"}
                          className="text-[11px] py-0 font-medium"
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
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <HelpCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold">Permanent Log Storage:</span>
                <p className="text-xs opacity-80 mt-0.5">
                  To persist every API call log across server restarts, execute{" "}
                  <code className="font-mono bg-background-gray-secondary px-1 py-0.5 rounded text-[11px]">
                    supabase/migration_ai_usage_logs.sql
                  </code>{" "}
                  in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
