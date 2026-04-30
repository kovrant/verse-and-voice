"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface SidebarVisibilityValue {
  visible: boolean
  setVisible: (v: boolean) => void
  toggle: () => void
}

const SidebarVisibilityContext = createContext<SidebarVisibilityValue>({
  visible: true,
  setVisible: () => {},
  toggle: () => {},
})

export function SidebarVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  return (
    <SidebarVisibilityContext.Provider
      value={{
        visible,
        setVisible,
        toggle: () => setVisible((v) => !v),
      }}
    >
      {children}
    </SidebarVisibilityContext.Provider>
  )
}

export const useSidebarVisibility = () => useContext(SidebarVisibilityContext)
