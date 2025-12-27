"use client"

import { Upload, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { useState } from "react"

import { importRcLootCsv, importMrtLoot } from "@/actions/loots"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/lib/queries/keys"
import { s } from "@/lib/safe-stringify"
import { useQueryClient } from "@tanstack/react-query"

type LootImportDialogProps = {
    raidSessionId: string
}

export function LootImportDialog({ raidSessionId }: LootImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [rcCsvData, setRcCsvData] = useState("")
    const [mrtData, setMrtData] = useState("")
    const [importAssigned, setImportAssigned] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const queryClient = useQueryClient()

    const handleRcImport = async () => {
        if (!rcCsvData.trim()) {
            toast.error("Please paste RC Loot Council CSV data")
            return
        }

        setIsLoading(true)
        try {
            const result = await importRcLootCsv(raidSessionId, rcCsvData, importAssigned)
            toast.success(`Imported ${s(result.imported)} loot items`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, raidSessionId],
            })
            setRcCsvData("")
            setOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to import loot")
        } finally {
            setIsLoading(false)
        }
    }

    const handleMrtImport = async () => {
        if (!mrtData.trim()) {
            toast.error("Please paste MRT loot data")
            return
        }

        setIsLoading(true)
        try {
            const result = await importMrtLoot(raidSessionId, mrtData)
            toast.success(`Imported ${s(result.imported)} loot items`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, raidSessionId],
            })
            setMrtData("")
            setOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to import loot")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Import Loot
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Loot</DialogTitle>
                    <DialogDescription>
                        Import loot from RC Loot Council CSV export or MRT addon.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="rc" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rc">RC Loot Council</TabsTrigger>
                        <TabsTrigger value="mrt">MRT</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rc" className="space-y-4">
                        <div>
                            <Label htmlFor="rc-csv">
                                Paste CSV data from RC Loot Council export
                            </Label>
                            <Textarea
                                id="rc-csv"
                                placeholder="player,date,time,id,item,itemID,itemString,response,..."
                                value={rcCsvData}
                                onChange={(e) => {
                                    setRcCsvData(e.target.value)
                                }}
                                className="mt-2 h-48 font-mono text-xs"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="import-assigned"
                                checked={importAssigned}
                                onCheckedChange={(checked) => {
                                    setImportAssigned(checked === true)
                                }}
                            />
                            <Label htmlFor="import-assigned" className="text-sm">
                                Import assigned character from CSV
                            </Label>
                        </div>
                        <Button
                            onClick={() => void handleRcImport()}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            Import RC Loot Council
                        </Button>
                    </TabsContent>

                    <TabsContent value="mrt" className="space-y-4">
                        <div>
                            <Label htmlFor="mrt-data">Paste MRT loot export data</Label>
                            <Textarea
                                id="mrt-data"
                                placeholder="timeRec#encounterID#instanceID#difficulty#playerName#classID#quantity#itemLink#rollType"
                                value={mrtData}
                                onChange={(e) => {
                                    setMrtData(e.target.value)
                                }}
                                className="mt-2 h-48 font-mono text-xs"
                            />
                        </div>
                        <Button
                            onClick={() => void handleMrtImport()}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            Import MRT Loot
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
