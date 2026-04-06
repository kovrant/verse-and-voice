"use client"

import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { convertToPKR } from "@/lib/exchange-rates"

interface FeeDisplayProps {
  amount: number
  currency: string
  rates: Record<string, number> | null
  size?: "sm" | "lg"
}

export function FeeDisplay({ amount, currency, rates, size = "sm" }: FeeDisplayProps) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const pkrAmount = convertToPKR(amount, currency, rates)

  if (size === "lg") {
    return (
      <div>
        <p className="text-2xl font-bold text-emerald-400">
          {symbol}{amount.toLocaleString()}
          <span className="text-sm font-medium text-muted-foreground ml-1">{currency}</span>
        </p>
        {pkrAmount !== null && (
          <p className="text-sm font-semibold text-amber-400/80 mt-1">
            Rs{pkrAmount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">PKR</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="leading-tight">
      <span className="text-sm font-semibold text-emerald-400">
        {symbol}{amount.toLocaleString()}
      </span>
      {pkrAmount !== null && (
        <span className="block text-[11px] text-amber-400/70 font-medium">
          Rs{pkrAmount.toLocaleString()}
        </span>
      )}
    </div>
  )
}
