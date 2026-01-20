
"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkIsMobile();

    // Listen for changes
    window.addEventListener("resize", checkIsMobile)
    
    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return !!isMobile
}
