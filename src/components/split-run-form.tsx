"use client"

import { Calculator } from "lucide-react"
import { useState, type JSX } from "react"
import type { SplitRunParams } from "@/shared/models/split-run.models"
import { Button } from "./ui/button"
import { GlassCard } from "./ui/glass-card"
import { Label } from "./ui/label"
import { NumberInput } from "./ui/number-input"

type SplitRunFormProps = {
    onCalculate: (params: SplitRunParams) => void
    isCalculating: boolean
}

export default function SplitRunForm({
    onCalculate,
    isCalculating,
}: SplitRunFormProps): JSX.Element {
    const [numRuns, setNumRuns] = useState(2)
    const [targetSize, setTargetSize] = useState(20)
    const [minItemLevel, setMinItemLevel] = useState<number | undefined>(undefined)
    const [errors, setErrors] = useState<{
        numRuns?: string
        targetSize?: string
        minItemLevel?: string
    }>({})

    const validateForm = (): boolean => {
        const newErrors: {
            numRuns?: string
            targetSize?: string
            minItemLevel?: string
        } = {}

        if (numRuns < 1 || numRuns > 10) {
            newErrors.numRuns = "Must be between 1 and 10"
        }

        if (targetSize < 10 || targetSize > 30) {
            newErrors.targetSize = "Must be between 10 and 30"
        }

        if (minItemLevel !== undefined && (minItemLevel < 0 || minItemLevel > 1000)) {
            newErrors.minItemLevel = "Must be between 0 and 1000"
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
            numRuns,
            targetSize,
            minItemLevel,
        })
    }

    const handleNumRunsChange = (value: number) => {
        setNumRuns(value)
        if (errors.numRuns) {
            setErrors({ ...errors, numRuns: undefined })
        }
    }

    const handleTargetSizeChange = (value: number) => {
        setTargetSize(value)
        if (errors.targetSize) {
            setErrors({ ...errors, targetSize: undefined })
        }
    }

    const handleMinItemLevelChange = (value: number | undefined) => {
        setMinItemLevel(value)
        if (errors.minItemLevel) {
            setErrors({ ...errors, minItemLevel: undefined })
        }
    }

    return (
        <GlassCard variant="solid" padding="lg" className="backdrop-blur-none bg-card/80">
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
                {/* Number of runs input */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="numRuns" className="text-sm font-medium">
                        Runs
                    </Label>
                    <NumberInput
                        id="numRuns"
                        min={1}
                        max={10}
                        value={numRuns}
                        onChange={handleNumRunsChange}
                        className={errors.numRuns ? "border-red-500 w-24" : "w-24"}
                        disabled={isCalculating}
                    />
                    {errors.numRuns && (
                        <p className="text-sm text-red-500">{errors.numRuns}</p>
                    )}
                </div>

                {/* Target size input */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="targetSize" className="text-sm font-medium">
                        Players/Run
                    </Label>
                    <NumberInput
                        id="targetSize"
                        min={10}
                        max={30}
                        value={targetSize}
                        onChange={handleTargetSizeChange}
                        className={errors.targetSize ? "border-red-500 w-24" : "w-24"}
                        disabled={isCalculating}
                    />
                    {errors.targetSize && (
                        <p className="text-sm text-red-500">{errors.targetSize}</p>
                    )}
                </div>

                {/* Minimum item level input */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="minItemLevel" className="text-sm font-medium">
                        Min iLvl
                    </Label>
                    <NumberInput
                        id="minItemLevel"
                        min={0}
                        max={1000}
                        value={minItemLevel}
                        onChange={handleMinItemLevelChange}
                        placeholder="Any"
                        allowEmpty
                        className={errors.minItemLevel ? "border-red-500 w-24" : "w-24"}
                        disabled={isCalculating}
                    />
                    {errors.minItemLevel && (
                        <p className="text-sm text-red-500">{errors.minItemLevel}</p>
                    )}
                </div>

                {/* Calculate button */}
                <Button
                    type="submit"
                    disabled={isCalculating}
                    className="flex items-center gap-2"
                >
                    <Calculator className="w-4 h-4" />
                    {isCalculating ? "Calculating..." : "Calculate"}
                </Button>
            </form>
        </GlassCard>
    )
}
