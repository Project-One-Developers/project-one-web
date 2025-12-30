"use client"

import { FileSpreadsheet } from "lucide-react"
import { useMemo, type JSX } from "react"
import { DroptimizerCard } from "@/components/droptimizer-card"
import DroptimizerNewDialog from "@/components/droptimizer-new-dialog"
import { GlobalFilterUI } from "@/components/global-filter-ui"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
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
        return <LoadingSpinner size="lg" iconSize="lg" text="Loading droptimizers..." />
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            {filteredDroptimizers.length > 0 ? (
                <div className="flex flex-wrap gap-4 justify-center">
                    {filteredDroptimizers.map((dropt) => (
                        <DroptimizerCard
                            key={dropt.url}
                            droptimizer={dropt}
                            character={characters.find((c) => c.id === dropt.characterId)}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<FileSpreadsheet className="w-8 h-8" />}
                    title="No droptimizers found"
                    description="Import a droptimizer simulation to see upgrade recommendations"
                />
            )}

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
