"use client"

import * as Tabs from "@radix-ui/react-tabs"
import * as ToggleGroup from "@radix-ui/react-toggle-group"
import { LoaderCircle, X } from "lucide-react"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import { useSearchItems } from "@/lib/queries/items"
import {
    useAddManualLoot,
    useImportMrtLoot,
    useImportRcAssignments,
    useImportRcLoot,
} from "@/lib/queries/loots"
import { RAID_DIFF } from "@/shared/consts/wow.consts"
import type { Item } from "@/shared/models/item.model"
import type { NewLootManual } from "@/shared/models/loot.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"
import { Textarea } from "./ui/textarea"
import { WowItemIcon } from "./wow/wow-item-icon"

export default function SessionLootNewDialog({
    isOpen,
    setOpen,
    raidSessionId,
}: {
    isOpen: boolean
    setOpen: (open: boolean) => void
    raidSessionId: string
}): JSX.Element {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedItems, setSelectedItems] = useState<NewLootManual[]>([])
    const [rcCsvData, setRcInputData] = useState("")
    const [mrtData, setMrtData] = useState("")

    const { data: items, isLoading } = useSearchItems(searchTerm)

    const addManualLootsMutation = useAddManualLoot()
    const addRcLootsMutation = useImportRcLoot()
    const addRcAssignementsMutation = useImportRcAssignments()
    const addMrtLootsMutation = useImportMrtLoot()

    const handleAddManualLoots = () => {
        addManualLootsMutation.mutate(
            {
                raidSessionId,
                manualLoots: selectedItems,
            },
            {
                onSuccess: () => {
                    setSelectedItems([])
                    setOpen(false)
                    toast.success("Loots successfully added.")
                },
                onError: (error) => {
                    toast.error(`Failed to add loots. ${error.message}`)
                },
            }
        )
    }

    const handleItemSelect = (item: Item) => {
        const newloot: NewLootManual = {
            itemId: item.id,
            raidDifficulty: "Heroic",
            hasSocket: false,
            hasAvoidance: false,
            hasLeech: false,
            hasSpeed: false,
        }
        setSelectedItems([...selectedItems, newloot])
        setSearchTerm("")
    }

    const handleRcImportLoots = (importAssignedCharacter: boolean) => {
        addRcLootsMutation.mutate(
            {
                raidSessionId,
                csv: rcCsvData,
                importAssignedCharacter,
            },
            {
                onSuccess: () => {
                    setRcInputData("")
                    setOpen(false)
                    toast.success("Loots successfully imported.")
                },
                onError: (error) => {
                    toast.error(`Failed to import RC. ${error.message}`)
                },
            }
        )
    }

    const handleRcImportAssignements = () => {
        addRcAssignementsMutation.mutate(
            {
                raidSessionId,
                csv: rcCsvData,
            },
            {
                onSuccess: () => {
                    setRcInputData("")
                    setOpen(false)
                    toast.success("Assignments successfully imported.")
                },
                onError: (error) => {
                    toast.error(`Failed to import RC. ${error.message}`)
                },
            }
        )
    }

    const handleMrtImport = () => {
        addMrtLootsMutation.mutate(
            {
                raidSessionId,
                data: mrtData,
            },
            {
                onSuccess: () => {
                    setMrtData("")
                    setOpen(false)
                    toast.success("Loots successfully imported.")
                },
                onError: (error) => {
                    toast.error(`Failed to import MRT. ${error.message}`)
                },
            }
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>New Loots</DialogTitle>
                    <DialogDescription>
                        Add new loots manually or import from RCLoot
                    </DialogDescription>
                </DialogHeader>
                <Tabs.Root defaultValue="mrt" className="w-full">
                    <Tabs.List className="flex border-border rounded-t-lg mb-4 p-1">
                        <Tabs.Trigger
                            value="manual"
                            className="px-4 py-2 flex-1 text-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border font-medium"
                        >
                            Manual Entry
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="rcloot"
                            className="px-4 py-2 flex-1 text-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border font-medium"
                        >
                            RCLoot CSV
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="mrt"
                            className="px-4 py-2 flex-1 text-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border font-medium"
                        >
                            MRT
                        </Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="manual" className="p-1">
                        <Input
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                            }}
                            placeholder="Search for an item..."
                        />
                        {isLoading && (
                            <LoaderCircle className="animate-spin text-5xl mt-2" />
                        )}
                        {items && (
                            <ul className="mt-2 max-h-60 overflow-y-auto">
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="cursor-pointer hover:bg-muted p-2"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleItemSelect(item)
                                        }}
                                    >
                                        <WowItemIcon
                                            item={item}
                                            iconOnly={false}
                                            raidDiff="Mythic"
                                            showIlvl={false}
                                            showRoleIcons={true}
                                            className="mt-2"
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="space-y-2 mt-2">
                            {selectedItems.map((selectedItem, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-2 p-2 border rounded"
                                >
                                    <div className="flex">
                                        <WowItemIcon
                                            item={selectedItem.itemId}
                                            iconOnly={false}
                                            raidDiff={selectedItem.raidDifficulty}
                                        />
                                    </div>

                                    {/* Raid Difficulty Selection */}
                                    <div className="flex">
                                        <Select
                                            value={selectedItem.raidDifficulty}
                                            onValueChange={(value: WowRaidDifficulty) => {
                                                setSelectedItems((prev) =>
                                                    prev.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  raidDifficulty: value,
                                                              }
                                                            : item
                                                    )
                                                )
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {RAID_DIFF.map((difficulty) => (
                                                    <SelectItem
                                                        key={difficulty}
                                                        value={difficulty}
                                                    >
                                                        {difficulty}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Item bonus */}
                                    <div className="flex">
                                        <ToggleGroup.Root
                                            type="multiple"
                                            className="flex gap-2"
                                            value={(
                                                [
                                                    "hasSocket",
                                                    "hasAvoidance",
                                                    "hasLeech",
                                                    "hasSpeed",
                                                ] as const
                                            ).filter((key) => selectedItem[key])}
                                            onValueChange={(values) => {
                                                setSelectedItems((prev) =>
                                                    prev.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  hasSocket:
                                                                      values.includes(
                                                                          "hasSocket"
                                                                      ),
                                                                  hasAvoidance:
                                                                      values.includes(
                                                                          "hasAvoidance"
                                                                      ),
                                                                  hasLeech:
                                                                      values.includes(
                                                                          "hasLeech"
                                                                      ),
                                                                  hasSpeed:
                                                                      values.includes(
                                                                          "hasSpeed"
                                                                      ),
                                                              }
                                                            : item
                                                    )
                                                )
                                            }}
                                        >
                                            <ToggleGroup.Item
                                                value="hasSocket"
                                                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-900 text-gray-500 opacity-50 hover:opacity-80 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:opacity-100 transition"
                                            >
                                                Socket
                                            </ToggleGroup.Item>
                                            <ToggleGroup.Item
                                                value="hasAvoidance"
                                                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-900 text-gray-500 opacity-50 hover:opacity-80 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:opacity-100 transition"
                                            >
                                                A
                                            </ToggleGroup.Item>
                                            <ToggleGroup.Item
                                                value="hasLeech"
                                                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-900 text-gray-500 opacity-50 hover:opacity-80 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:opacity-100 transition"
                                            >
                                                L
                                            </ToggleGroup.Item>
                                            <ToggleGroup.Item
                                                value="hasSpeed"
                                                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-900 text-gray-500 opacity-50 hover:opacity-80 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:opacity-100 transition"
                                            >
                                                S
                                            </ToggleGroup.Item>
                                        </ToggleGroup.Root>
                                    </div>

                                    <div className="flex ml-auto">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedItems(
                                                    selectedItems.filter(
                                                        (_, i) => i !== index
                                                    )
                                                )
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            className="w-full mt-4"
                            onClick={handleAddManualLoots}
                            disabled={
                                addManualLootsMutation.isPending ||
                                selectedItems.length === 0
                            }
                        >
                            {addManualLootsMutation.isPending && (
                                <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                            )}
                            Add Loots
                        </Button>
                    </Tabs.Content>
                    <Tabs.Content value="rcloot" className="p-1">
                        <Textarea
                            value={rcCsvData}
                            onChange={(e) => {
                                setRcInputData(e.target.value)
                            }}
                            placeholder="Paste RCLoot CSV data here..."
                            rows={10}
                        />
                        <div className="flex gap-2 mt-4">
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    handleRcImportLoots(false)
                                }}
                                disabled={
                                    addRcLootsMutation.isPending || !rcCsvData.trim()
                                }
                            >
                                {addRcLootsMutation.isPending ? (
                                    <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                                ) : null}
                                Import Loots
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    handleRcImportLoots(true)
                                }}
                                disabled={
                                    addRcLootsMutation.isPending || !rcCsvData.trim()
                                }
                            >
                                {addRcLootsMutation.isPending ? (
                                    <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                                ) : null}
                                Import Loots + Assigned
                            </Button>
                            <Button
                                className="flex-1"
                                variant="secondary"
                                onClick={handleRcImportAssignements}
                                disabled={
                                    addRcAssignementsMutation.isPending ||
                                    !rcCsvData.trim()
                                }
                            >
                                {addRcAssignementsMutation.isPending ? (
                                    <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                                ) : null}
                                Import Assigned
                            </Button>
                        </div>
                    </Tabs.Content>
                    <Tabs.Content value="mrt" className="p-1">
                        <Textarea
                            value={mrtData}
                            onChange={(e) => {
                                setMrtData(e.target.value)
                            }}
                            placeholder="Paste MRT data here..."
                            rows={10}
                        />
                        <Button
                            className="w-full mt-4"
                            onClick={handleMrtImport}
                            disabled={addMrtLootsMutation.isPending || !mrtData.trim()}
                        >
                            {addMrtLootsMutation.isPending && (
                                <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                            )}
                            Import Loots
                        </Button>
                    </Tabs.Content>
                </Tabs.Root>
            </DialogContent>
        </Dialog>
    )
}
