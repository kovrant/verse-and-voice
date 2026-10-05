---
type: domain-concept
title: "Google Gemini AI Usage, Quotas, and Dedicated Analytics"
description: "AI generation quota tracking, circular dashboard meter, rate limit monitoring, and dedicated usage audit route."
status: stable
verified: true
sources:
  - "src/app/api/ai/usage/route.ts"
  - "src/components/gemini-quota-card.tsx"
  - "src/app/ai-usage/page.tsx"
  - "src/app/page.tsx"
tags:
  - domain
  - ai
  - gemini
  - quota
  - dashboard
---

# Google Gemini AI Usage, Quotas, and Dedicated Analytics

Quran Academy leverages Google Gemini models (defaulting to `gemini-2.0-flash` / `gemini-2.5-flash`) for automated Islamic story generation, quiz creation with 4 options, and educational prompts.

---

## ⚡ Daily Quota & Rate Limit Invariants

1. **Free Tier Quota Baseline:**
   * **Daily Requests:** 1,500 Requests Per Day (RPD).
   * **Rate Limit:** 15 Requests Per Minute (RPM).
   * **Daily Reset:** Midnight Pacific Time (PT / UTC-8 / UTC-7 depending on DST).
   * **Token Limit:** Up to 1,000,000 Tokens Per Minute (TPM).

2. **Database Logging Table (`ai_usage_logs`):**
   * Stores every LLM execution with timestamp, user ID, module (`story`, `quiz`), model name, prompt tokens, completion tokens, total tokens, status, and error notice if any.
   * Enables historical audits and monthly token aggregation.

---

## 🖥️ Teacher Dashboard vs. Dedicated `/ai-usage` Page

### 1. Teacher Dashboard (`src/app/page.tsx` & `GeminiQuotaCard` variant `"dashboard"`)
* **Minimalist Visual Footprint:** Takes up half of the desktop row (`lg:col-span-1`), paired with an elevated **Quick Actions Hub**.
* **Circular Progress Meter:** Compact SVG progress ring (70x70px) calculating percentage of remaining daily quota rather than a wide horizontal line.
* **Calm Aesthetic:** Removes noisy everyday token counters (`TOKENS TODAY`, `MONTH TOKENS`, `RATE LIMIT`) from the teacher's primary view so the dashboard remains clean.
* **Smart Alerting:** Only surfaces alert banners when usage is high (>80% used) or quota is critically low (<=50 requests remaining or exhausted).
* **Direct Navigation:** Includes a quick "Token Details →" link directing the teacher to the full audit page.

### 2. Dedicated Analytics Route (`/ai-usage`)
* **Complete Token Analytics:** Full breakdown of today's tokens, monthly cumulative tokens, daily remaining requests, and rate limits.
* **Recent Activity Feed:** Table showing recent AI generation tasks, execution status, tokens consumed, and timestamp.
* **Countdown Clock:** Live time calculation showing hours and minutes until Pacific Time midnight quota reset.
* **Google AI Studio Integration:** One-click shortcut to upstream Google AI Studio console for direct billing and API key configuration.
