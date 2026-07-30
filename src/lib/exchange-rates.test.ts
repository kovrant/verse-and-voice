import { describe, expect, it } from "vitest"

import { feeCurrencyBreakdown, sumFeesPKR } from "./exchange-rates"
import type { FeePaymentWithStudent } from "./utils"

// Rates are quoted FROM PKR (1 PKR = 0.0027 GBP), so converting TO PKR divides.
const RATES = { GBP: 0.0025, USD: 0.0036, PKR: 1 }

function fee(amount: number, currency: string): FeePaymentWithStudent {
  return {
    id: Math.random().toString(36).slice(2),
    student_id: "s1",
    month: 1,
    year: 2026,
    is_paid: true,
    paid_at: null,
    students: { name: "A", fee: amount, fee_currency: currency, status: "Reading" },
  }
}

describe("sumFeesPKR", () => {
  it("adds PKR fees as-is and converts foreign ones", () => {
    expect(sumFeesPKR([fee(5000, "PKR"), fee(35, "GBP")], RATES)).toBe(5000 + 14000)
  })

  it("skips rows it cannot convert instead of counting them as raw PKR", () => {
    // £35 must never land in the total as Rs 35 while rates are still loading.
    expect(sumFeesPKR([fee(35, "GBP")], null)).toBe(0)
    expect(sumFeesPKR([fee(5000, "PKR"), fee(35, "EUR")], RATES)).toBe(5000)
  })
})

describe("feeCurrencyBreakdown", () => {
  it("totals per original currency", () => {
    expect(feeCurrencyBreakdown([fee(35, "GBP"), fee(15, "GBP"), fee(5000, "PKR")])).toEqual({
      GBP: 50,
      PKR: 5000,
    })
  })
})
