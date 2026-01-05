"use client"

import type { CheckedState } from "@radix-ui/react-checkbox"
import { Loader2 } from "lucide-react"
import React, { useState, useMemo, type JSX } from "react"
import { toast } from "sonner"
import { useAddCharacterWithSync, useEditCharacter } from "@/lib/queries/players"
import type {
    Character,
    EditCharacterData,
    NewCharacterWithoutClass,
    Player,
} from "@/shared/models/character.models"
import type { WoWRole } from "@/shared/models/wow.models"
import { REALMS, ROLES } from "@/shared/wow.consts"
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
}

type FormErrors = {
    name?: string
    realm?: string
    role?: string
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
            }
        }
        return {
            name: "",
            realm: "Pozzo dell'Eternità",
            role: "DPS",
            main: false,
            priority: 1,
        }
    }, [mode, existingCharacter])

    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [errors, setErrors] = useState<FormErrors>({})
    // Track the last open state to reset form when dialog opens
    const [lastOpen, setLastOpen] = useState(isOpen)

    const addMutation = useAddCharacterWithSync()
    const editMutation = useEditCharacter()

    // Reset form when dialog opens (transition from closed to open)
    if (isOpen && !lastOpen) {
        setFormData(initialFormData)
        setErrors({})
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
        })
        setErrors({})
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

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        if (mode === "edit" && existingCharacter) {
            const editData: EditCharacterData = {
                name: formData.name,
                realm: formData.realm,
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
                    toast.error(`Unable to add the character. Error: ${error.message}`)
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

    const isLoading = addMutation.isPending || editMutation.isPending

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
                        <Select value={formData.role} onValueChange={handleRoleChange}>
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

                    <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <Checkbox
                            id="main"
                            checked={formData.main as CheckedState}
                            onCheckedChange={(checked) => {
                                handleInputChange("main", checked === true)
                            }}
                            className="h-5 w-5"
                        />
                        <div className="space-y-1 leading-none">
                            <Label htmlFor="main">Main Character</Label>
                            <p className="text-sm text-muted-foreground">
                                Check this if this is the player&apos;s main character.
                            </p>
                        </div>
                    </div>

                    {mode === "edit" && (
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Input
                                id="priority"
                                type="number"
                                min={1}
                                max={100}
                                value={formData.priority}
                                onChange={(e) => {
                                    handleInputChange(
                                        "priority",
                                        Math.max(
                                            1,
                                            Math.min(100, parseInt(e.target.value) || 1)
                                        )
                                    )
                                }}
                            />
                            <p className="text-sm text-muted-foreground">
                                Priority level (1-100). Higher values = higher priority.
                            </p>
                        </div>
                    )}

                    <Button disabled={isLoading} type="submit">
                        {isLoading ? <Loader2 className="animate-spin" /> : "Confirm"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
