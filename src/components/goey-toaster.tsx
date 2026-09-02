"use client"

import { GooeyToaster } from "goey-toast"

import { useTheme } from "@/components/theme-provider"

export function GoeyToasterHost() {
  const { dark } = useTheme()

  return (
    <GooeyToaster
      position="bottom-right"
      theme={dark ? "dark" : "light"}
      preset="smooth"
      showTimestamp={false}
    />
  )
}
