"use client"

import { Loader2, PlusIcon, Recycle, RefreshCw, Upload } from "lucide-react"
import React, { useState, type JSX } from "react"
import { toast } from "sonner"
import {
    useAddSimC,
    useAddSimulationFromUrl,
    useDeleteSimulationsOlderThan,
    useSyncDroptimizersFromDiscord,
} from "@/lib/queries/droptimizers"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { NumberInput } from "./ui/number-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"

export default function DroptimizerNewDialog(): JSX.Element {
    const [open, setOpen] = useState(false)
    const [hoursValue, setHoursValue] = useState(12)
    const [url, setUrl] = useState("")
    const [simcData, setSimcData] = useState("")

    const manualMutation = useAddSimulationFromUrl()
    const syncMutation = useSyncDroptimizersFromDiscord()
    const cleanupMutation = useDeleteSimulationsOlderThan()
    const simcImportMutation = useAddSimC()

    const handleSyncFromDiscord = () => {
        syncMutation.mutate(
            { hours: hoursValue },
            {
                onSuccess: () => {
                    toast.success(
                        "Droptimizers have been successfully synced from Discord."
                    )
                },
                onError: (error: Error) => {
                    toast.error(
                        `Unable to sync droptimizers from Discord. Error: ${error.message}`
                    )
                },
            }
        )
    }

    const handleCleanup = () => {
        cleanupMutation.mutate(
            { hours: hoursValue },
            {
                onSuccess: () => {
                    toast.success("Droptimizers have been successfully cleaned up")
                },
                onError: (error: Error) => {
                    toast.error(`Unable to cleanup droptimizers. Error: ${error.message}`)
                },
            }
        )
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) {
            return
        }
        manualMutation.mutate(url, {
            onSuccess: () => {
                setUrl("")
                toast.success("The droptimizer has been successfully added.")
            },
            onError: (error: Error) => {
                toast.error(`Unable to add the droptimizer. Error: ${error.message}`)
            },
        })
    }

    const handleSimcSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!simcData.trim()) {
            return
        }
        simcImportMutation.mutate(simcData, {
            onSuccess: () => {
                setSimcData("")
                toast.success("Successfully imported SimC data.")
            },
            onError: (error: Error) => {
                toast.error(`Unable to import SimC data. Error: ${error.message}`)
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className={cn(
                        "w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center",
                        "bg-primary hover:bg-primary/80 text-primary-foreground"
                    )}
                    title="Add New Droptimizer"
                >
                    <PlusIcon
                        size={24}
                        className="hover:rotate-45 ease-linear transition-transform"
                    />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-131.25">
                <DialogHeader>
                    <DialogTitle>New droptimizer</DialogTitle>
                    <DialogDescription>
                        Add a new droptimizer manually, import from SimC, sync from
                        Discord, or cleanup old entries
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="sync" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="sync">Sync</TabsTrigger>
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                        <TabsTrigger value="simc">SimC</TabsTrigger>
                        <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sync" className="p-4">
                        <div className="flex items-center gap-x-4">
                            <div className="flex-1">
                                <Button
                                    onClick={handleSyncFromDiscord}
                                    className="w-full"
                                    disabled={syncMutation.isPending}
                                >
                                    <div className="flex items-center justify-center w-full">
                                        <div className="flex-none w-6 flex justify-start">
                                            {syncMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="grow text-center">
                                            {syncMutation.isPending
                                                ? "Syncing..."
                                                : "Sync last"}
                                        </div>
                                    </div>
                                </Button>
                            </div>
                            <NumberInput
                                id="sync-hours-input"
                                min={1}
                                value={hoursValue}
                                onChange={setHoursValue}
                                suffix="hrs"
                                className="w-28"
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="manual" className="p-4">
                        <form
                            onSubmit={handleManualSubmit}
                            className="flex flex-col gap-y-4"
                        >
                            <div>
                                <Label htmlFor="url-input">Droptimizer URL</Label>
                                <Input
                                    id="url-input"
                                    value={url}
                                    onChange={(e) => {
                                        setUrl(e.target.value)
                                    }}
                                    placeholder="Enter droptimizer URL..."
                                />
                            </div>
                            <Button disabled={manualMutation.isPending} type="submit">
                                {manualMutation.isPending ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    "Add"
                                )}
                            </Button>
                        </form>
                    </TabsContent>
                    <TabsContent value="simc" className="p-4">
                        <form
                            onSubmit={handleSimcSubmit}
                            className="flex flex-col gap-y-4"
                        >
                            <div>
                                <Label htmlFor="simc-input">SimC Data</Label>
                                <Textarea
                                    id="simc-input"
                                    value={simcData}
                                    onChange={(e) => {
                                        setSimcData(e.target.value)
                                    }}
                                    placeholder="Paste your SimC character data here..."
                                    className="min-h-50 resize-y"
                                />
                            </div>
                            <Button disabled={simcImportMutation.isPending} type="submit">
                                {simcImportMutation.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import
                                    </>
                                )}
                            </Button>
                        </form>
                    </TabsContent>
                    <TabsContent value="cleanup" className="p-4">
                        <div className="flex items-center gap-x-4">
                            <div className="flex-1">
                                <Button
                                    onClick={() => {
                                        handleCleanup()
                                    }}
                                    disabled={cleanupMutation.isPending}
                                    className="w-full"
                                >
                                    <div className="flex items-center justify-center w-full">
                                        <div className="flex-none w-6 flex justify-start">
                                            {cleanupMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Recycle className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="grow text-center">
                                            {cleanupMutation.isPending
                                                ? "Cleaning..."
                                                : "Clean older than"}
                                        </div>
                                    </div>
                                </Button>
                            </div>
                            <NumberInput
                                id="cleanup-hours-input"
                                min={1}
                                value={hoursValue}
                                onChange={setHoursValue}
                                suffix="hrs"
                                className="w-28"
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
