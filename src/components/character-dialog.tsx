"use client"

import type { CheckedState } from "@radix-ui/react-checkbox"
import { AlertCircle, Loader2 } from "lucide-react"
import React, { useState, useMemo, type JSX } from "react"
import { toast } from "sonner"
import { ERROR_CODES, isErrorCode } from "@/lib/errors"
import {
    useAddCharacterWithManualClass,
    useAddCharacterWithSync,
    useEditCharacter,
} from "@/lib/queries/players"
import type {
    Character,
    EditCharacterData,
    NewCharacter,
    NewCharacterWithoutClass,
    Player,
} from "@/shared/models/character.models"
import type { WowClassName, WoWRole } from "@/shared/models/wow.models"
import { CLASSES_NAME, REALMS, ROLES } from "@/shared/wow.consts"
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from "./ui/alert"
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
import { Label } from "./ui/label"
import { NumberInput } from "./ui/number-input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"

type CharacterDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    mode: "add" | "edit"
    player?: Player
    existingCharacter?: Character
}

type FormData = {
    name: string
    realm: string
    role: WoWRole
    main: boolean
    priority: number // Only used in edit mode (officer-only)
    class: WowClassName | null // Only used when manual class fallback is needed
}

type FormErrors = {
    name?: string
    realm?: string
    role?: string
    class?: string
}

export default function CharacterDialog({
    isOpen,
    setOpen,
    mode,
    player,
    existingCharacter,
}: CharacterDialogProps): JSX.Element {
    if (mode === "edit" && !existingCharacter) {
        throw new Error("Cannot edit a character that does not exist")
    }
    if (mode === "add" && !player) {
        throw new Error("Cannot add a character without a player")
    }

    // Derive initial form data from props
    const initialFormData = useMemo((): FormData => {
        if (mode === "edit" && existingCharacter) {
            return {
                name: existingCharacter.name,
                realm: existingCharacter.realm,
                role: existingCharacter.role,
                main: existingCharacter.main,
                priority: existingCharacter.priority ?? 1,
                class: existingCharacter.class,
            }
        }
        return {
            name: "",
            realm: "Pozzo dell'Eternità",
            role: "DPS",
            main: false,
            priority: 1,
            class: null,
        }
    }, [mode, existingCharacter])

    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [errors, setErrors] = useState<FormErrors>({})
    // Track the last open state to reset form when dialog opens
    const [lastOpen, setLastOpen] = useState(isOpen)
    // Show manual class selector when Blizzard API fails
    const [showManualClassFallback, setShowManualClassFallback] = useState(false)
    // Show confirmation dialog when changing class in edit mode
    const [showClassChangeConfirm, setShowClassChangeConfirm] = useState(false)

    const addMutation = useAddCharacterWithSync()
    const addManualClassMutation = useAddCharacterWithManualClass()
    const editMutation = useEditCharacter()

    // Reset form when dialog opens (transition from closed to open)
    if (isOpen && !lastOpen) {
        setFormData(initialFormData)
        setErrors({})
        setShowManualClassFallback(false)
        setShowClassChangeConfirm(false)
        setLastOpen(true)
    } else if (!isOpen && lastOpen) {
        setLastOpen(false)
    }

    const resetForm = () => {
        setFormData({
            name: "",
            realm: "Pozzo dell'Eternità",
            role: "DPS",
            main: false,
            priority: 1,
            class: null,
        })
        setErrors({})
        setShowManualClassFallback(false)
        setShowClassChangeConfirm(false)
    }

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        if (!formData.name.trim()) {
            newErrors.name = "Name is required"
        }

        if (!formData.realm.trim()) {
            newErrors.realm = "Realm is required"
        }

        if (!formData.role.trim()) {
            newErrors.role = "Role is required"
        }

        // Validate class in edit mode or when manual fallback is active
        if ((mode === "edit" || showManualClassFallback) && !formData.class) {
            newErrors.class = "Class is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        if (mode === "edit" && existingCharacter) {
            // Check if class was changed and needs confirmation
            const classChanged = formData.class !== existingCharacter.class
            if (classChanged && !showClassChangeConfirm) {
                setShowClassChangeConfirm(true)
                return
            }

            const editData: EditCharacterData = {
                name: formData.name,
                realm: formData.realm,
                class: formData.class ?? undefined,
                role: formData.role,
                main: formData.main,
                priority: formData.priority,
            }
            editMutation.mutate(
                { id: existingCharacter.id, data: editData },
                {
                    onSuccess: () => {
                        setOpen(false)
                        toast.success(`Character ${formData.name} edited successfully`)
                    },
                    onError: (error) => {
                        toast.error(
                            `Unable to edit the character. Error: ${error.message}`
                        )
                    },
                }
            )
        } else {
            if (!player) {
                throw Error("Unable to add character without selecting a player")
            }

            // If manual class fallback is active and class is selected, use manual flow
            if (showManualClassFallback && formData.class) {
                const addData: NewCharacter = {
                    name: formData.name,
                    realm: formData.realm,
                    role: formData.role,
                    main: formData.main,
                    playerId: player.id,
                    class: formData.class,
                }
                addManualClassMutation.mutate(addData, {
                    onSuccess: () => {
                        resetForm()
                        setOpen(false)
                        toast.success(
                            `The character ${formData.name} has been successfully added.`
                        )
                    },
                    onError: (error) => {
                        toast.error(
                            `Unable to add the character. Error: ${error.message}`
                        )
                    },
                })
                return
            }

            // Normal flow: try to fetch class from Blizzard API
            const addData: NewCharacterWithoutClass = {
                name: formData.name,
                realm: formData.realm,
                role: formData.role,
                main: formData.main,
                playerId: player.id,
            }
            addMutation.mutate(addData, {
                onSuccess: () => {
                    resetForm()
                    setOpen(false)
                    toast.success(
                        `The character ${formData.name} has been successfully added.`
                    )
                },
                onError: (error) => {
                    // Show manual class fallback only for Blizzard API errors or character not found
                    const isBlizzardError =
                        isErrorCode(error.serialized, ERROR_CODES.BLIZZARD_API_ERROR) ||
                        isErrorCode(error.serialized, ERROR_CODES.NOT_FOUND)

                    if (isBlizzardError) {
                        setShowManualClassFallback(true)
                        toast.error(
                            "Could not fetch character data from Blizzard. Please select the class manually."
                        )
                    } else {
                        // For other errors (auth, network, etc.), show the actual error message
                        toast.error(error.message)
                    }
                },
            })
        }
    }

    const handleInputChange = (
        field: keyof FormData,
        value: string | boolean | number
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleRoleChange = (value: string) => {
        handleInputChange("role", value)
    }

    const isLoading =
        addMutation.isPending ||
        addManualClassMutation.isPending ||
        editMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "add" ? "New" : "Edit"} character for {player?.name}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "add"
                            ? "Enter the character name and realm. Class and gear will be fetched automatically from the Blizzard API."
                            : "Edit the character details"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                    {/* Name - full width */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => {
                                handleInputChange("name", e.target.value)
                            }}
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>

                    {/* Realm + Role row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="realm">Realm</Label>
                            <Select
                                value={formData.realm}
                                onValueChange={(value) => {
                                    handleInputChange("realm", value)
                                }}
                            >
                                <SelectTrigger
                                    className={errors.realm ? "border-red-500" : ""}
                                >
                                    <SelectValue placeholder="Select a server" />
                                </SelectTrigger>
                                <SelectContent>
                                    {REALMS.EU.map((r) => (
                                        <SelectItem key={r.slug} value={r.name}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.realm && (
                                <p className="text-sm text-red-500">{errors.realm}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={handleRoleChange}
                            >
                                <SelectTrigger
                                    className={errors.role ? "border-red-500" : ""}
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {r}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.role && (
                                <p className="text-sm text-red-500">{errors.role}</p>
                            )}
                        </div>
                    </div>

                    {/* Class + Main row (when class visible) OR just Main toggle */}
                    {mode === "edit" || showManualClassFallback ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="class">Class</Label>
                                <Select
                                    value={formData.class ?? undefined}
                                    onValueChange={(value) => {
                                        handleInputChange("class", value)
                                    }}
                                >
                                    <SelectTrigger
                                        className={errors.class ? "border-red-500" : ""}
                                    >
                                        <SelectValue placeholder="Select a class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLASSES_NAME.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.class && (
                                    <p className="text-sm text-red-500">{errors.class}</p>
                                )}
                            </div>

                            {/* Compact main toggle aligned with class selector */}
                            <div className="space-y-2">
                                <Label className="invisible">Main</Label>
                                <div className="flex items-center h-10 gap-2">
                                    <Checkbox
                                        id="main"
                                        checked={formData.main as CheckedState}
                                        onCheckedChange={(checked) => {
                                            handleInputChange("main", checked === true)
                                        }}
                                    />
                                    <Label
                                        htmlFor="main"
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        Main character
                                    </Label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Compact main toggle when class is not shown */
                        <div className="flex items-center gap-2 py-2">
                            <Checkbox
                                id="main"
                                checked={formData.main as CheckedState}
                                onCheckedChange={(checked) => {
                                    handleInputChange("main", checked === true)
                                }}
                            />
                            <Label
                                htmlFor="main"
                                className="text-sm font-normal cursor-pointer"
                            >
                                Main character
                            </Label>
                        </div>
                    )}

                    {/* API fallback alert */}
                    {showManualClassFallback && mode === "add" && (
                        <Alert variant="destructive">
                            <AlertIcon>
                                <AlertCircle className="h-4 w-4" />
                            </AlertIcon>
                            <AlertContent>
                                <AlertTitle>Blizzard API unavailable</AlertTitle>
                                <AlertDescription>
                                    Could not fetch character data automatically. Please
                                    select the class manually.
                                </AlertDescription>
                            </AlertContent>
                        </Alert>
                    )}

                    {mode === "edit" && (
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <NumberInput
                                id="priority"
                                min={1}
                                max={100}
                                value={formData.priority}
                                onChange={(val) => {
                                    handleInputChange("priority", val)
                                }}
                            />
                            <p className="text-sm text-muted-foreground">
                                Priority level (1-100). Higher values = higher priority.
                            </p>
                        </div>
                    )}

                    {/* Class change confirmation */}
                    {showClassChangeConfirm && (
                        <Alert variant="warning">
                            <AlertIcon>
                                <AlertCircle className="h-4 w-4" />
                            </AlertIcon>
                            <AlertContent>
                                <AlertTitle>Confirm Class Change</AlertTitle>
                                <AlertDescription>
                                    Changing the character&apos;s class may affect loot
                                    eligibility, armor type calculations, and spec
                                    assignments.
                                </AlertDescription>
                            </AlertContent>
                        </Alert>
                    )}

                    <div className="flex gap-2">
                        {showClassChangeConfirm && (
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowClassChangeConfirm(false)
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            disabled={isLoading}
                            type="submit"
                            className={showClassChangeConfirm ? "flex-1" : "w-full"}
                            variant={showClassChangeConfirm ? "destructive" : "default"}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" />
                            ) : showClassChangeConfirm ? (
                                "Confirm Change"
                            ) : (
                                "Confirm"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
