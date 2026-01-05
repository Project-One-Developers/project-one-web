"use client"

import { Calculator } from "lucide-react"
import { useState, type JSX } from "react"
import type { SplitRunParams } from "@/shared/models/split-run.models"
import { Button } from "./ui/button"
import { GlassCard } from "./ui/glass-card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

type SplitRunFormProps = {
    onCalculate: (params: SplitRunParams) => void
    isCalculating: boolean
}

export default function SplitRunForm({
    onCalculate,
    isCalculating,
}: SplitRunFormProps): JSX.Element {
    const [numRuns, setNumRuns] = useState("2")
    const [targetSize, setTargetSize] = useState("20")
    const [minItemLevel, setMinItemLevel] = useState("")
    const [errors, setErrors] = useState<{
        numRuns?: string
        targetSize?: string
        minItemLevel?: string
    }>({})

    const validateForm = (): boolean => {
        const newErrors: { numRuns?: string; targetSize?: string; minItemLevel?: string } = {}

        const numRunsValue = parseInt(numRuns, 10)
        if (isNaN(numRunsValue) || numRunsValue < 1 || numRunsValue > 10) {
            newErrors.numRuns = "Must be between 1 and 10"
        }

        const targetSizeValue = parseInt(targetSize, 10)
        if (isNaN(targetSizeValue) || targetSizeValue < 10 || targetSizeValue > 30) {
            newErrors.targetSize = "Must be between 10 and 30"
        }

        if (minItemLevel) {
            const minIlvlValue = parseInt(minItemLevel, 10)
            if (isNaN(minIlvlValue) || minIlvlValue < 0 || minIlvlValue > 1000) {
                newErrors.minItemLevel = "Must be between 0 and 1000"
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        onCalculate({
            numRuns: parseInt(numRuns, 10),
            targetSize: parseInt(targetSize, 10),
            minItemLevel: minItemLevel ? parseInt(minItemLevel, 10) : undefined,
        })
    }

    const handleNumRunsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNumRuns(e.target.value)
        if (errors.numRuns) {
            setErrors({ ...errors, numRuns: undefined })
        }
    }

    const handleTargetSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTargetSize(e.target.value)
        if (errors.targetSize) {
            setErrors({ ...errors, targetSize: undefined })
        }
    }

    const handleMinItemLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMinItemLevel(e.target.value)
        if (errors.minItemLevel) {
            setErrors({ ...errors, minItemLevel: undefined })
        }
    }

    return (
        <GlassCard variant="solid" padding="lg" className="backdrop-blur-none bg-card/80">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Number of runs input */}
                    <div className="flex flex-col gap-2 flex-1">
                        <Label htmlFor="numRuns" className="text-sm font-medium">
                            Number of Runs
                        </Label>
                        <Input
                            id="numRuns"
                            type="number"
                            min="1"
                            max="10"
                            value={numRuns}
                            onChange={handleNumRunsChange}
                            className={errors.numRuns ? "border-red-500" : ""}
                            disabled={isCalculating}
                        />
                        {errors.numRuns && (
                            <p className="text-sm text-red-500">{errors.numRuns}</p>
                        )}
                    </div>

                    {/* Target size input */}
                    <div className="flex flex-col gap-2 flex-1">
                        <Label htmlFor="targetSize" className="text-sm font-medium">
                            Target Players per Run
                        </Label>
                        <Input
                            id="targetSize"
                            type="number"
                            min="10"
                            max="30"
                            value={targetSize}
                            onChange={handleTargetSizeChange}
                            className={errors.targetSize ? "border-red-500" : ""}
                            disabled={isCalculating}
                        />
                        {errors.targetSize && (
                            <p className="text-sm text-red-500">{errors.targetSize}</p>
                        )}
                    </div>

                    {/* Minimum item level input */}
                    <div className="flex flex-col gap-2 flex-1">
                        <Label htmlFor="minItemLevel" className="text-sm font-medium">
                            Min Item Level (Optional)
                        </Label>
                        <Input
                            id="minItemLevel"
                            type="number"
                            min="0"
                            max="1000"
                            value={minItemLevel}
                            onChange={handleMinItemLevelChange}
                            placeholder="No minimum"
                            className={errors.minItemLevel ? "border-red-500" : ""}
                            disabled={isCalculating}
                        />
                        {errors.minItemLevel && (
                            <p className="text-sm text-red-500">{errors.minItemLevel}</p>
                        )}
                    </div>
                </div>

                {/* Calculate button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isCalculating}
                        className="flex items-center gap-2"
                    >
                        <Calculator className="w-4 h-4" />
                        {isCalculating ? "Calculating..." : "Calculate Split Runs"}
                    </Button>
                </div>
            </form>
        </GlassCard>
    )
}
