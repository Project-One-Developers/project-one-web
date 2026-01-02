"use client"

import { ExternalLink, Pencil, Plus, Settings, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import SpreadsheetLinkDialog from "@/components/spreadsheet-link-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { IconButton } from "@/components/ui/icon-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SectionHeader } from "@/components/ui/section-header"
import {
    useDeleteSpreadsheetLink,
    useSpreadsheetLinks,
} from "@/lib/queries/spreadsheet-links"
import type { SpreadsheetLink } from "@/shared/models/spreadsheet-link.models"

export default function SettingsPage(): JSX.Element {
    const router = useRouter()
    const { data: links, isLoading, error } = useSpreadsheetLinks()
    const deleteMutation = useDeleteSpreadsheetLink()

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLink, setEditingLink] = useState<SpreadsheetLink | undefined>()

    const handleAdd = () => {
        setEditingLink(undefined)
        setDialogOpen(true)
    }

    const handleEdit = (link: SpreadsheetLink) => {
        setEditingLink(link)
        setDialogOpen(true)
    }

    const handleDelete = (link: SpreadsheetLink) => {
        deleteMutation.mutate(link.id, {
            onSuccess: () => {
                toast.success(`"${link.title}" deleted`)
                router.refresh()
            },
            onError: (err) => {
                toast.error(`Failed to delete: ${err.message}`)
            },
        })
    }

    if (isLoading) {
        return (
            <div className="w-full min-h-screen p-8 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading settings..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full min-h-screen p-8 flex items-center justify-center">
                <EmptyState
                    icon={<Settings className="w-8 h-8" />}
                    title="Error loading settings"
                    description={error.message}
                />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen p-8 flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage application settings and configuration
                    </p>
                </div>
            </div>

            {/* Spreadsheet Links Section */}
            <GlassCard padding="lg">
                <div className="flex items-center justify-between mb-4">
                    <SectionHeader>Spreadsheet Links</SectionHeader>
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Link
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                    External spreadsheet links shown in the sidebar for officers.
                </p>

                {!links || links.length === 0 ? (
                    <EmptyState
                        size="sm"
                        icon={<ExternalLink className="w-6 h-6" />}
                        title="No spreadsheet links"
                        description="Add your first spreadsheet link to get started"
                    />
                ) : (
                    <div className="space-y-2">
                        {links.map((link) => (
                            <div
                                key={link.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 hover:border-primary/20 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{link.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {link.url}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <IconButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            handleEdit(link)
                                        }}
                                        icon={<Pencil className="w-4 h-4" />}
                                    />
                                    <IconButton
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            handleDelete(link)
                                        }}
                                        disabled={deleteMutation.isPending}
                                        icon={<Trash2 className="w-4 h-4" />}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            <SpreadsheetLinkDialog
                isOpen={dialogOpen}
                setOpen={setDialogOpen}
                existingLink={editingLink}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </div>
    )
}
