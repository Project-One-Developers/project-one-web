"use client"

import type { ReactNode } from "react"
import { FilterProvider } from "@/lib/filter-context"

type GlobalFilterProviderProps = {
    children: ReactNode
}

export function GlobalFilterProvider({ children }: GlobalFilterProviderProps) {
    return <FilterProvider>{children}</FilterProvider>
}
