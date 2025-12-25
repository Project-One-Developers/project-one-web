"use client"

import { DroptimizerCard } from "@/components/droptimizer-card"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { useCharacters } from "@/lib/queries/players"
import { LoaderCircle } from "lucide-react"
import { useMemo, type JSX } from "react"

export default function DroptimizerPage(): JSX.Element {
    const droptimizerQuery = useLatestDroptimizers()
    const charQuery = useCharacters()

    const droptimizers = useMemo(() => {
        return droptimizerQuery.data ?? []
    }, [droptimizerQuery.data])

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
                {droptimizers.length > 0 ? (
                    droptimizers.map((dropt) => (
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://media1.tenor.com/m/md1_j1SnRSkAAAAd/brian-david-gilbert-nothing-here.gif"
                            alt="Empty"
                            width={400}
                            height={400}
                            className="rounded-lg"
                        />
                        <p className="text-muted-foreground">No droptimizers found</p>
                    </div>
                )}
            </div>
        </div>
    )
}
