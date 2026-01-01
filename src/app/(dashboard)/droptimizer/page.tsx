"use client"

import { FileSpreadsheet } from "lucide-react"
import { useMemo, type JSX } from "react"
import { DroptimizerCard } from "@/components/droptimizer-card"
import DroptimizerNewDialog from "@/components/droptimizer-new-dialog"
import { FilterBar } from "@/components/filter-bar"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useFilterContext } from "@/lib/filter-context"
import { filterDroptimizer } from "@/lib/filters"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { useCharacters } from "@/lib/queries/players"

export default function DroptimizerPage(): JSX.Element {
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
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-6 p-8">
            {/* Filter Bar with New Button */}
            <div className="flex flex-col sm:flex-row gap-4">
                <FilterBar
                    showRaidDifficulty={true}
                    showDroptimizerFilters={true}
                    showMainsAlts={true}
                    showUpgradesToggle={true}
                    showClassFilter={true}
                    showSlotFilter={true}
                    showArmorTypeFilter={true}
                    className="flex-1"
                />
                <DroptimizerNewDialog />
            </div>

            {/* Droptimizer Cards */}
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
        </div>
    )
}
