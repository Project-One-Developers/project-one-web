"use client"

import { useUpdateItemBisSpecs } from "@/lib/queries/bis-list"
import { useItemNote, useSetItemNote } from "@/lib/queries/items"
import { WOW_CLASS_WITH_SPECS } from "@/shared/libs/spec-parser/spec-utils.schemas"
import type { Item } from "@/shared/types/types"
import * as ToggleGroup from "@radix-ui/react-toggle-group"
import { Loader2, StickyNote } from "lucide-react"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"
import { WowClassIcon } from "./wow/wow-class-icon"
import { WowItemIcon } from "./wow/wow-item-icon"
import { WowSpecIcon } from "./wow/wow-spec-icon"

type ItemWithBisSpecs = {
    item: Item
    specs: number[]
}

type ItemManagementDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    itemAndSpecs: ItemWithBisSpecs | null
}

export default function ItemManagementDialog({
    isOpen,
    setOpen,
    itemAndSpecs,
}: ItemManagementDialogProps): JSX.Element {
    const updateBisMutation = useUpdateItemBisSpecs()
    const setItemNoteMutation = useSetItemNote()

    // Fetch item note
    const itemNoteQuery = useItemNote(itemAndSpecs?.item.id)

    // Initialize state from props - use key prop on parent to reset when itemAndSpecs changes
    const [selectedSpecs, setSelectedSpecs] = useState<number[]>(
        () => itemAndSpecs?.specs ?? []
    )
    const [itemNote, setItemNote] = useState<string>(() => itemNoteQuery.data?.note ?? "")
    const [activeTab, setActiveTab] = useState<string>("bis-specs")

    // Update itemNote when query data loads (only if different from current state)
    const queryNote = itemNoteQuery.data?.note ?? ""
    if (queryNote !== itemNote && itemNote === "" && queryNote !== "") {
        setItemNote(queryNote)
    }

    const handleSaveNote = () => {
        if (!itemAndSpecs) {
            return
        }

        setItemNoteMutation.mutate(
            { id: itemAndSpecs.item.id, note: itemNote },
            {
                onSuccess: () => {
                    toast.success("Item note updated successfully")
                },
                onError: (error: Error) => {
                    toast.error(`Failed to update item note: ${error.message}`)
                },
            }
        )
    }

    const handleBisSave = () => {
        if (!itemAndSpecs) {
            return
        }

        updateBisMutation.mutate(
            { itemId: itemAndSpecs.item.id, specIds: selectedSpecs },
            {
                onSuccess: () => {
                    toast.success("BiS specs updated successfully")
                    setOpen(false)
                },
                onError: (error: Error) => {
                    toast.error(`Failed to update BiS specs: ${error.message}`)
                },
            }
        )
    }

    if (!itemAndSpecs) {
        return <></>
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <WowItemIcon item={itemAndSpecs.item} iconOnly={true} />
                                {itemAndSpecs.item.name}
                            </DialogTitle>
                            <DialogDescription>
                                Manage BiS specs and add notes for this item
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="bis-specs">BiS Specs</TabsTrigger>
                        <TabsTrigger value="notes" className="flex items-center gap-2">
                            <StickyNote size={16} />
                            Notes
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: BiS Specs */}
                    <TabsContent value="bis-specs" className="mt-4">
                        <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                            {WOW_CLASS_WITH_SPECS.map((classWithSpecs, index) => {
                                // Filter specs based on itemAndSpecs.item.specIds
                                const itemSpecIds = itemAndSpecs.item.specIds
                                const filteredSpecs =
                                    itemSpecIds && itemSpecIds.length > 0
                                        ? classWithSpecs.specs.filter((spec) =>
                                              itemSpecIds.includes(spec.id)
                                          )
                                        : classWithSpecs.specs

                                // Only render the class if it has specs to show
                                if (filteredSpecs.length === 0) {
                                    return null
                                }

                                return (
                                    <div
                                        key={index}
                                        className="flex flex-row items-center"
                                    >
                                        <div className="flex">
                                            <WowClassIcon
                                                wowClassName={classWithSpecs.name}
                                                className="h-8 w-8 border-2 border-background rounded-lg"
                                            />
                                            <ToggleGroup.Root
                                                type="multiple"
                                                className="flex ml-4 gap-2"
                                                value={selectedSpecs.map(String)}
                                                onValueChange={(values) => {
                                                    setSelectedSpecs(values.map(Number))
                                                }}
                                            >
                                                {filteredSpecs.map((wowSpec) => (
                                                    <ToggleGroup.Item
                                                        key={wowSpec.id}
                                                        value={String(wowSpec.id)}
                                                        className="px-3 py-1 rounded-md border border-gray-700 bg-gray-900 text-gray-500 opacity-50 hover:opacity-80 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:opacity-100 transition"
                                                    >
                                                        <WowSpecIcon
                                                            specId={wowSpec.id}
                                                            className="object-cover object-top rounded-md full h-5 w-5 border border-background"
                                                            title={wowSpec.name}
                                                        />
                                                    </ToggleGroup.Item>
                                                ))}
                                            </ToggleGroup.Root>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <Button
                            className="w-full mt-4"
                            onClick={handleBisSave}
                            disabled={updateBisMutation.isPending}
                        >
                            {updateBisMutation.isPending ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                "Save BiS Specs"
                            )}
                        </Button>
                    </TabsContent>

                    {/* Tab 2: Notes */}
                    <TabsContent value="notes" className="mt-4">
                        <div className="flex flex-col gap-4">
                            <div>
                                <Textarea
                                    placeholder="Add any notes about this item (priority, special considerations, etc.)"
                                    value={itemNote}
                                    onChange={(e) => {
                                        setItemNote(e.target.value)
                                    }}
                                    className="min-h-[200px] resize-none"
                                />
                            </div>
                            <Button
                                onClick={handleSaveNote}
                                disabled={setItemNoteMutation.isPending}
                                className="w-full"
                            >
                                {setItemNoteMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Note"
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
