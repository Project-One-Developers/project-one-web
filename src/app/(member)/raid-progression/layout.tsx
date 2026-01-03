"use client"

import { FilterProvider } from "@/lib/filter-context"

export default function RaidProgressionLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <FilterProvider>{children}</FilterProvider>
}
