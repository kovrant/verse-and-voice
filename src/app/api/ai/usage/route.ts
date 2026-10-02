import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface UsageLogItem {
  id: string
  created_at: string
  model: string
  feature: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  status: "success" | "rate_limited" | "error" | "fallback"
  topic?: string | null
  error_message?: string | null
}

export async function GET() {
  const { denied } = await requireTeacher()
  if (denied) return denied

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  const isConfigured = !!apiKey

  // Default Gemini 2.0 Flash Free Tier limits
  const dailyLimit = Number(process.env.GEMINI_DAILY_LIMIT) || 1500
  const rpmLimit = 15

  // Calculate Pacific Time midnight boundaries (Google resets at 00:00 PT)
  const now = new Date()
  let ptMidnight: Date
  let nextPtMidnight: Date

  try {
    const ptDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const parts = ptDateFormatter.formatToParts(now)
    const year = parts.find((p) => p.type === "year")?.value
    const month = parts.find((p) => p.type === "month")?.value
    const day = parts.find((p) => p.type === "day")?.value
    
    // Construct PT midnight in UTC
    ptMidnight = new Date(`${year}-${month}-${day}T00:00:00-07:00`)
    nextPtMidnight = new Date(ptMidnight.getTime() + 24 * 60 * 60 * 1000)
  } catch {
    // Fallback: 24h rolling window if Intl tz fails
    ptMidnight = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    nextPtMidnight = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }

  const resetInSeconds = Math.max(0, Math.round((nextPtMidnight.getTime() - now.getTime()) / 1000))

  // Start of current month in UTC
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  try {
    const admin = createSupabaseAdminClient()

    // 1. Fetch today's logs
    const { data: todayLogs, error: todayErr } = await admin
      .from("ai_usage_logs")
      .select("id, created_at, model, feature, prompt_tokens, completion_tokens, total_tokens, status, topic")
      .gte("created_at", ptMidnight.toISOString())
      .order("created_at", { ascending: false })

    if (todayErr) {
      // Table may not be created yet in Supabase
      return NextResponse.json({
        configured: isConfigured,
        table_ready: false,
        model: "gemini-3.5-flash",
        tier: "Free Tier (1,500 RPD / 15 RPM)",
        daily_limit: dailyLimit,
        rpm_limit: rpmLimit,
        requests_today: 0,
        requests_remaining: dailyLimit,
        tokens_today: 0,
        tokens_this_month: 0,
        reset_in_seconds: resetInSeconds,
        recent_logs: [],
        notice: "Run migration_ai_usage_logs.sql in Supabase SQL editor to activate persistent logging.",
      })
    }

    const todayItems = (todayLogs || []) as UsageLogItem[]
    const requestsToday = todayItems.filter(
      (r) => r.status === "success" || r.status === "rate_limited",
    ).length
    const tokensToday = todayItems.reduce((acc, r) => acc + (r.total_tokens || 0), 0)

    // 2. Fetch monthly totals
    const { data: monthLogs } = await admin
      .from("ai_usage_logs")
      .select("total_tokens, status")
      .gte("created_at", startOfMonth.toISOString())

    const monthItems = (monthLogs || []) as { total_tokens: number; status: string }[]
    const tokensThisMonth = monthItems.reduce((acc, r) => acc + (r.total_tokens || 0), 0)
    const requestsThisMonth = monthItems.length

    // 3. Fetch recent 5 logs
    const recentLogs = todayItems.slice(0, 5).map((log) => ({
      id: log.id,
      created_at: log.created_at,
      topic: log.topic || "Islamic Quiz",
      tokens: log.total_tokens,
      status: log.status,
      model: log.model,
    }))

    const requestsRemaining = Math.max(0, dailyLimit - requestsToday)

    return NextResponse.json({
      configured: isConfigured,
      table_ready: true,
      model: "gemini-3.5-flash",
      tier: "Free Tier (1,500 RPD / 15 RPM)",
      daily_limit: dailyLimit,
      rpm_limit: rpmLimit,
      requests_today: requestsToday,
      requests_remaining: requestsRemaining,
      requests_this_month: requestsThisMonth,
      tokens_today: tokensToday,
      tokens_this_month: tokensThisMonth,
      reset_in_seconds: resetInSeconds,
      recent_logs: recentLogs,
    })
  } catch (err) {
    console.error("Error fetching AI usage telemetry:", err)
    return NextResponse.json(
      {
        configured: isConfigured,
        table_ready: false,
        daily_limit: dailyLimit,
        requests_today: 0,
        requests_remaining: dailyLimit,
        tokens_today: 0,
        tokens_this_month: 0,
        reset_in_seconds: resetInSeconds,
        recent_logs: [],
        error: "Failed to query database for AI telemetry",
      },
      { status: 500 },
    )
  }
}
