"use client"

import { createContext, type ReactNode, useContext, useState } from "react"

interface SidebarVisibilityValue {
  visible: boolean
  setVisible: (v: boolean) => void
  toggle: () => void
  /** Below lg the sidebar is a drawer; the top bar's menu button opens it. */
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarVisibilityContext = createContext<SidebarVisibilityValue>({
  visible: true,
  setVisible: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})

export function SidebarVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <SidebarVisibilityContext.Provider
      value={{
        visible,
        setVisible,
        toggle: () => setVisible((v) => !v),
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarVisibilityContext.Provider>
  )
}

export const useSidebarVisibility = () => useContext(SidebarVisibilityContext)
