"use client"

import { Filter, X } from "lucide-react"
import { useFilterContext } from "@/lib/filter-context"
import { cn } from "@/lib/utils"
import { FiltersPanel } from "./filter-panel"

type GlobalFilterUIProps = {
    showRaidDifficulty?: boolean
    showDroptimizerFilters?: boolean
    showMainsAlts?: boolean
    showClassFilter?: boolean
    showSlotFilter?: boolean
    showArmorTypeFilter?: boolean
    className?: string
}

export const GlobalFilterUI: React.FC<GlobalFilterUIProps> = ({
    showRaidDifficulty = true,
    showDroptimizerFilters = true,
    showMainsAlts = true,
    showClassFilter = true,
    showSlotFilter = true,
    showArmorTypeFilter = true,
    className,
}) => {
    const { filter, updateFilter, isFilterOpen, setIsFilterOpen, hasActiveFilters } =
        useFilterContext()

    const toggleFilterPanel = () => {
        setIsFilterOpen(!isFilterOpen)
    }

    return (
        <>
            {/* Floating Filter Button */}
            <button
                onClick={toggleFilterPanel}
                className={cn(
                    "fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center z-50",
                    "bg-card/80 backdrop-blur-md border border-border/50",
                    "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:scale-105",
                    hasActiveFilters && "border-primary/50 shadow-primary/20"
                )}
                title="Toggle Filters"
            >
                <div
                    className={cn(
                        "transition-all duration-300",
                        hasActiveFilters ? "text-primary" : "text-muted-foreground",
                        "group-hover:text-primary"
                    )}
                >
                    {isFilterOpen ? <X size={22} /> : <Filter size={22} />}
                </div>
                {hasActiveFilters && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
            </button>

            {/* Filter Panel Overlay */}
            {isFilterOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity duration-300"
                        onClick={() => {
                            setIsFilterOpen(false)
                        }}
                    />
                    {/* Panel */}
                    <div className="fixed bottom-24 right-6 z-50 max-w-md w-[360px] animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <FiltersPanel
                            filter={filter}
                            updateFilter={updateFilter}
                            showRaidDifficulty={showRaidDifficulty}
                            showDroptimizerFilters={showDroptimizerFilters}
                            showMainsAlts={showMainsAlts}
                            showClassFilter={showClassFilter}
                            showSlotFilter={showSlotFilter}
                            showArmorTypeFilter={showArmorTypeFilter}
                            className={className}
                        />
                    </div>
                </>
            )}
        </>
    )
}
