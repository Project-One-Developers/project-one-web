"use client"

import { useUpdateItemBisSpecs } from "@/lib/queries/bis-list"
import { useItemNote, useSetItemNote } from "@/lib/queries/items"
import { useCharactersWithLootsByItemId } from "@/lib/queries/loots"
import { WOW_CLASS_WITH_SPECS } from "@/shared/libs/spec-parser/spec-utils.schemas"
import type { CharacterWithGears, Item } from "@/shared/types/types"
import * as ToggleGroup from "@radix-ui/react-toggle-group"
import { Loader2, Search, StickyNote, Users } from "lucide-react"
import { useState, useMemo, type JSX } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"
import { WowCharacterIcon } from "./wow/wow-character-icon"
import { WowClassIcon } from "./wow/wow-class-icon"
import { WowGearIcon } from "./wow/wow-gear-icon"
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
                                Manage BiS specs, view character inventory, and add notes
                                for this item
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="bis-specs">BiS Specs</TabsTrigger>
                        <TabsTrigger
                            value="inventory"
                            className="flex items-center gap-2"
                        >
                            <Users size={16} />
                            Inventory
                        </TabsTrigger>
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

                    {/* Tab 2: Character Inventory */}
                    <TabsContent value="inventory" className="mt-4">
                        <CharacterInventoryContent itemId={itemAndSpecs.item.id} />
                    </TabsContent>

                    {/* Tab 3: Notes */}
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

// Character Inventory Content Component
function CharacterInventoryContent({ itemId }: { itemId: number }) {
    const [searchFilter, setSearchFilter] = useState("")
    const [includeAlts, setIncludeAlts] = useState(false)

    const { data, isLoading, error } = useCharactersWithLootsByItemId(itemId)

    const filteredCharacters = useMemo(() => {
        if (!data) {
            return { withItem: [], withoutItem: [] }
        }

        const charactersWithGears: CharacterWithGears[] = data

        // Apply search filter and main/alt filter
        const filterByNameAndMain = (char: CharacterWithGears) => {
            const matchesName = char.name
                .toLowerCase()
                .includes(searchFilter.toLowerCase())
            const matchesMainFilter = includeAlts ? true : char.main
            return matchesName && matchesMainFilter
        }

        // Split characters into two groups
        const charactersWithMatchingItem = charactersWithGears
            .filter((char) => char.gears.some((gear) => gear.item.id === itemId))
            .filter(filterByNameAndMain)

        const charactersWithoutMatchingItem = charactersWithGears
            .filter((char) => !char.gears.some((gear) => gear.item.id === itemId))
            .filter(filterByNameAndMain)
            .sort((a, b) => Number(b.main) - Number(a.main))

        return {
            withItem: charactersWithMatchingItem,
            withoutItem: charactersWithoutMatchingItem,
        }
    }, [data, itemId, searchFilter, includeAlts])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="animate-spin h-8 w-8" />
                <span className="ml-2">Loading character inventory...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[200px] text-red-500">
                Error loading character inventory
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-[200px]">
                No inventory data available
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto">
            {/* Search Bar with Include Alts Checkbox */}
            <div className="sticky top-0 bg-background z-10 pb-2 border-b">
                <div className="flex gap-3 items-center mr-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search characters by name..."
                            value={searchFilter}
                            onChange={(e) => {
                                setSearchFilter(e.target.value)
                            }}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="include-alts"
                            checked={includeAlts}
                            onCheckedChange={(checked) => {
                                setIncludeAlts(checked === true)
                            }}
                        />
                        <label
                            htmlFor="include-alts"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Include Alts
                        </label>
                    </div>
                </div>
            </div>

            {/* Characters WITH the item - Compact Grid Layout */}
            <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-green-400">
                    Characters with this item ({filteredCharacters.withItem.length})
                </h3>
                {filteredCharacters.withItem.length === 0 ? (
                    <p className="text-muted-foreground">
                        {searchFilter || !includeAlts
                            ? "No matching characters have this item."
                            : "No characters currently have this item."}
                    </p>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {filteredCharacters.withItem.map((character) => {
                            // Get all gears that match the item ID
                            const matchingGears = character.gears.filter(
                                (gear) => gear.item.id === itemId
                            )

                            return (
                                <div
                                    key={character.id}
                                    className="flex items-center gap-3 p-2 bg-green-900/20 rounded-lg hover:bg-green-900/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <WowCharacterIcon
                                            character={character}
                                            showMainIndicator={includeAlts}
                                            showName={false}
                                        />
                                        <span className="text-sm font-medium truncate">
                                            {character.name}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        {matchingGears.map((gear, index) => (
                                            <div
                                                key={index}
                                                className="relative"
                                                title={`${gear.item.name} - ${gear.source}`}
                                            >
                                                <WowGearIcon
                                                    gearItem={gear}
                                                    showTiersetLine={true}
                                                    showItemTrackDiff={true}
                                                    showSource={true}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="border-t border-muted-foreground/20 my-2"></div>

            {/* Characters WITHOUT the item */}
            <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-muted-foreground">
                    Characters without this item ({filteredCharacters.withoutItem.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                    {filteredCharacters.withoutItem.map((character) => (
                        <div key={character.id} className="flex-shrink-0">
                            <WowCharacterIcon
                                character={character}
                                showMainIndicator={includeAlts}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
