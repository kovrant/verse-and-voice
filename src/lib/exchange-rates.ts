"use client"

import { useState, useEffect } from "react"

interface Rates {
  [currency: string]: number
}

let cachedRates: Rates | null = null
let cacheTime = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

async function fetchRates(): Promise<Rates> {
  // Return cache if fresh
  if (cachedRates && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedRates
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/PKR")
    const data = await res.json()

    if (data.result === "success" && data.rates) {
      // API gives rates FROM PKR, we need rates TO PKR
      // So 1 GBP = (1 / rates.GBP) PKR
      cachedRates = data.rates
      cacheTime = Date.now()
      return data.rates
    }
  } catch (e) {
    console.error("Failed to fetch exchange rates:", e)
  }

  // Fallback rates (approximate) if API fails
  return { GBP: 0.0027, USD: 0.0036, SAR: 0.0133, BHD: 0.0014, PKR: 1 }
}

export function convertToPKR(amount: number, fromCurrency: string, rates: Rates | null): number | null {
  if (!rates || fromCurrency === "PKR") return null
  const rate = rates[fromCurrency]
  if (!rate || rate === 0) return null
  return Math.round(amount / rate)
}

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates | null>(cachedRates)
  const [loading, setLoading] = useState(!cachedRates)

  useEffect(() => {
    fetchRates().then(r => {
      setRates(r)
      setLoading(false)
    })
  }, [])

  return { rates, loading }
}

export function formatPKR(amount: number): string {
  return `Rs${amount.toLocaleString()}`
}
