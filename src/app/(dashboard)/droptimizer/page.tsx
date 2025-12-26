"use client"

import { LoaderCircle } from "lucide-react"

import Image from "next/image"
import { useMemo, type JSX } from "react"

import { DroptimizerCard } from "@/components/droptimizer-card"
import DroptimizerNewDialog from "@/components/droptimizer-new-dialog"
import { GlobalFilterUI } from "@/components/global-filter-ui"
import { FilterProvider, useFilterContext } from "@/lib/filter-context"
import { filterDroptimizer } from "@/lib/filters"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { useCharacters } from "@/lib/queries/players"

function DroptimizerPageContent(): JSX.Element {
    const { filter } = useFilterContext()
    const droptimizerQuery = useLatestDroptimizers()
    const charQuery = useCharacters()

    const filteredDroptimizers = useMemo(() => {
        if (!droptimizerQuery.data || !charQuery.data) {
            return []
        }
        return filterDroptimizer(droptimizerQuery.data, charQuery.data, filter)
    }, [droptimizerQuery.data, charQuery.data, filter])

    const characters = useMemo(() => {
        return charQuery.data ?? []
    }, [charQuery.data])

    if (droptimizerQuery.isLoading || charQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            <div className="flex flex-wrap gap-4">
                {filteredDroptimizers.length > 0 ? (
                    filteredDroptimizers.map((dropt) => (
                        <DroptimizerCard
                            key={dropt.url}
                            droptimizer={dropt}
                            character={characters.find(
                                (c) => c.name === dropt.charInfo.name
                            )}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <Image
                            src="https://media1.tenor.com/m/md1_j1SnRSkAAAAd/brian-david-gilbert-nothing-here.gif"
                            alt="Empty"
                            width={400}
                            height={400}
                            className="rounded-lg"
                            unoptimized
                        />
                        <p className="text-muted-foreground">No droptimizers found</p>
                    </div>
                )}
            </div>

            {/* Bottom Right Filter button */}
            <GlobalFilterUI
                showRaidDifficulty={true}
                showDroptimizerFilters={true}
                showClassFilter={true}
                showSlotFilter={true}
                showArmorTypeFilter={true}
            />

            {/* New Droptimizer Dialog Trigger, above the filter icon */}
            <div className="fixed bottom-24 right-6 z-50">
                <DroptimizerNewDialog />
            </div>
        </div>
    )
}

export default function DroptimizerPage(): JSX.Element {
    return (
        <FilterProvider>
            <DroptimizerPageContent />
        </FilterProvider>
    )
}
