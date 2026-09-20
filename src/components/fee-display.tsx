"use client"

import { convertToPKR } from "@/lib/exchange-rates"
import { CURRENCY_SYMBOLS } from "@/lib/utils"

interface FeeDisplayProps {
  amount: number
  currency: string
  rates: Record<string, number> | null
  size?: "sm" | "lg"
  /** Student portal ("storybook") styling — same numbers, kid palette. */
  kid?: boolean
}

export function FeeDisplay({ amount, currency, rates, size = "sm", kid = false }: FeeDisplayProps) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const pkrAmount = convertToPKR(amount, currency, rates)

  if (size === "lg") {
    return (
      <div>
        <p
          className={
            kid
              ? "font-heading text-[28px] font-bold leading-none text-foreground"
              : "text-2xl font-bold text-emerald-400"
          }
        >
          {symbol}
          {amount.toLocaleString()}
          <span
            className={
              kid
                ? "ml-1.5 text-[13px] font-bold text-muted-foreground"
                : "text-sm font-medium text-muted-foreground ml-1"
            }
          >
            {currency}
          </span>
        </p>
        {pkrAmount !== null && (
          <p
            className={
              kid
                ? "mt-1 text-[14px] font-bold text-foreground/85"
                : "text-sm font-semibold text-amber-400/80 mt-1"
            }
          >
            Rs{pkrAmount.toLocaleString()}{" "}
            <span
              className={
                kid
                  ? "text-[12px] font-semibold text-muted-foreground"
                  : "text-xs font-normal text-muted-foreground"
              }
            >
              PKR
            </span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="leading-tight">
      <span
        className={
          kid
            ? "text-[15px] font-extrabold text-foreground"
            : "text-sm font-semibold text-emerald-400"
        }
      >
        {symbol}
        {amount.toLocaleString()}
      </span>
      {pkrAmount !== null && (
        <span
          className={
            kid
              ? "block text-[12px] font-bold text-foreground/70"
              : "block text-[11px] text-amber-400/70 font-medium"
          }
        >
          Rs{pkrAmount.toLocaleString()}
        </span>
      )}
    </div>
  )
}
