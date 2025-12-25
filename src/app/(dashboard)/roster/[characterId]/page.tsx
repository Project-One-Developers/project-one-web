"use client"

import { getCharLatestGameInfoAction } from "@/actions/characters"
import CharacterDeleteDialog from "@/components/character-delete-dialog"
import CharacterDialog from "@/components/character-dialog"
import { Button } from "@/components/ui/button"
import { WowCharacterLink } from "@/components/wow/wow-character-links"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { WowItemIcon } from "@/components/wow/wow-item-icon"
import { useCharacter } from "@/lib/queries/players"
import { formaUnixTimestampToItalianDate } from "@/shared/libs/date/date-utils"
import type { CharacterGameInfo, Droptimizer } from "@/shared/types/types"
import {
    ArrowLeft,
    Edit,
    LoaderCircle,
    Trash2,
    TrendingUp,
    Calendar,
    Shield,
    Swords,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CharacterPage() {
    const params = useParams<{ characterId: string }>()
    const router = useRouter()
    const characterId = params.characterId

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [gameInfo, setGameInfo] = useState<CharacterGameInfo | null>(null)
    const [isLoadingGameInfo, setIsLoadingGameInfo] = useState(false)

    const characterQuery = useCharacter(characterId)
    const character = characterQuery.data

    // Fetch game info when character is loaded
    useEffect(() => {
        if (character) {
            setIsLoadingGameInfo(true)
            getCharLatestGameInfoAction(character.name, character.realm)
                .then(setGameInfo)
                .catch(console.error)
                .finally(() => setIsLoadingGameInfo(false))
        }
    }, [character])

    if (characterQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    if (!character) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <p className="text-muted-foreground">Character not found</p>
                <Button
                    variant="outline"
                    onClick={() => router.push("/roster")}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 p-8 relative">
            {/* Page Header */}
            <div className="bg-muted rounded-lg p-6 mb-2 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="hover:bg-gray-800 p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex flex-row space-x-4 items-center">
                            <WowClassIcon
                                wowClassName={character.class}
                                charname={character.name}
                                showTooltip={false}
                                className="h-10 w-10 border-2 border-background rounded-lg"
                            />
                            <h1 className="text-3xl font-bold">{character.name}</h1>
                        </div>
                        <div className="flex flex-row mt-2 gap-1">
                            <WowCharacterLink character={character} site="warcraftlogs" />
                            <WowCharacterLink character={character} site="raiderio" />
                            <WowCharacterLink character={character} site="armory" />
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        className="hover:bg-blue-700"
                        onClick={() => setIsEditDialogOpen(true)}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                        variant="destructive"
                        className="hover:bg-red-700"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Character Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard label="Realm" value={character.realm.replace(/-/g, " ")} />
                <InfoCard label="Class" value={character.class} />
                <InfoCard label="Role" value={character.role} />
                <InfoCard label="Main" value={character.main ? "Yes" : "No"} />
                <InfoCard label="Player" value={character.player?.name || "Unknown"} />
            </div>

            {/* Game Info Panel */}
            {isLoadingGameInfo ? (
                <div className="bg-muted rounded-lg p-6 flex justify-center">
                    <LoaderCircle className="animate-spin h-6 w-6" />
                </div>
            ) : gameInfo ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Droptimizer Section */}
                    <div className="bg-muted rounded-lg p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Droptimizer
                        </h3>
                        {gameInfo.droptimizer ? (
                            <DroptimizerInfo droptimizer={gameInfo.droptimizer} />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No droptimizer data available
                            </p>
                        )}
                    </div>

                    {/* Raider.io Section */}
                    <div className="bg-muted rounded-lg p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Swords className="h-5 w-5 text-orange-500" />
                            Raider.io
                        </h3>
                        {gameInfo.raiderio ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Item Level
                                    </span>
                                    <span className="font-medium">
                                        {gameInfo.raiderio.averageItemLevel}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Last Synced
                                    </span>
                                    <span className="font-medium text-sm">
                                        {formaUnixTimestampToItalianDate(
                                            gameInfo.raiderio.itemUpdateAt
                                        )}
                                    </span>
                                </div>
                                {gameInfo.raiderio.itemsEquipped &&
                                    gameInfo.raiderio.itemsEquipped.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Equipped Gear
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {gameInfo.raiderio.itemsEquipped
                                                    .slice(0, 8)
                                                    .map((item, idx) => (
                                                        <WowItemIcon
                                                            key={idx}
                                                            gearItem={item}
                                                            size="sm"
                                                        />
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No Raider.io data available
                            </p>
                        )}
                    </div>

                    {/* WoW Audit Section */}
                    <div className="bg-muted rounded-lg p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-500" />
                            WoW Audit
                        </h3>
                        {gameInfo.wowaudit ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Item Level
                                    </span>
                                    <span className="font-medium">
                                        {gameInfo.wowaudit.averageIlvl ?? "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Last Synced
                                    </span>
                                    <span className="font-medium text-sm">
                                        {formaUnixTimestampToItalianDate(
                                            gameInfo.wowaudit.wowauditLastModifiedUnixTs
                                        )}
                                    </span>
                                </div>
                                {gameInfo.wowaudit.hightestIlvlEverEquipped && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Highest iLvl
                                        </span>
                                        <span className="font-medium">
                                            {gameInfo.wowaudit.hightestIlvlEverEquipped}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No WoW Audit data available
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-muted rounded-lg p-6 text-center text-muted-foreground">
                    <p>No game info available for this character</p>
                </div>
            )}

            {/* Dialogs */}
            {character.player && (
                <CharacterDialog
                    isOpen={isEditDialogOpen}
                    setOpen={setIsEditDialogOpen}
                    mode="edit"
                    player={character.player}
                    existingCharacter={character}
                />
            )}
            <CharacterDeleteDialog
                isOpen={isDeleteDialogOpen}
                setOpen={setIsDeleteDialogOpen}
                character={character}
            />
        </div>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-lg font-medium capitalize">{value}</p>
        </div>
    )
}

function DroptimizerInfo({ droptimizer }: { droptimizer: Droptimizer }) {
    const topUpgrades = droptimizer.upgrades.slice(0, 5)

    return (
        <div className="space-y-3">
            <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Difficulty</span>
                <span className="font-medium capitalize">
                    {droptimizer.raidInfo.difficulty}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium text-sm">
                    {formaUnixTimestampToItalianDate(droptimizer.simInfo.date)}
                </span>
            </div>

            {topUpgrades.length > 0 && (
                <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Top Upgrades</p>
                    <div className="space-y-2">
                        {topUpgrades.map((upgrade, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between text-sm bg-background/50 rounded p-2"
                            >
                                <div className="flex items-center gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`https://wow.zamimg.com/images/wow/icons/small/${upgrade.item.iconName}.jpg`}
                                        alt={upgrade.item.name}
                                        className="h-6 w-6 rounded border border-background"
                                    />
                                    <span className="truncate max-w-[120px]">
                                        {upgrade.item.name}
                                    </span>
                                </div>
                                <span className="text-green-500 font-medium">
                                    +{upgrade.dps.toLocaleString()} DPS
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
