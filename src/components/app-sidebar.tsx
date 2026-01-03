"use client"

import {
    CloudDownload,
    FileSpreadsheet,
    History,
    LucideAccessibility,
    LucideBot,
    LucideCpu,
    LucideGauge,
    LucideMedal,
    LucideScrollText,
    LucideSnail,
    LucideSwords,
    Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { JSX } from "react"
import { clientEnv } from "@/env.client"
import type { UserRole } from "@/shared/models/auth.models"
import type { SpreadsheetLink } from "@/shared/models/spreadsheet-link.models"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
} from "./ui/sidebar"

const preparationItems = [
    {
        title: "Roster",
        url: "/roster",
        icon: LucideAccessibility,
    },
    {
        title: "Droptimizer",
        url: "/droptimizer",
        icon: LucideBot,
    },
    {
        title: "Loot Gains",
        url: "/loot-gains",
        icon: LucideGauge,
    },
    {
        title: "Loot Table",
        url: "/loot-table",
        icon: LucideScrollText,
    },
    {
        title: "Raid Progression",
        url: "/raid-progression",
        icon: LucideSnail,
    },
    {
        title: "Summary",
        url: "/summary",
        icon: LucideCpu,
    },
]

const raidItems = [
    {
        title: "Raid Session",
        url: "/raid-session",
        icon: LucideSwords,
    },
    {
        title: "Assign",
        url: "/assign",
        icon: LucideMedal,
    },
]

// Items accessible to all users (both officers and members)
const memberItems = [
    {
        title: "Loot Recap",
        url: "/loot-recap",
        icon: History,
    },
]

type AppSidebarProps = {
    userRole: UserRole
    spreadsheetLinks: SpreadsheetLink[]
}

export default function AppSidebar({
    userRole,
    spreadsheetLinks,
}: AppSidebarProps): JSX.Element {
    const pathname = usePathname()
    const { open } = useSidebar()

    if (!open) {
        return <SidebarTrigger className="absolute left-2 top-2 z-10" />
    }

    const isOfficer = userRole === "officer"

    return (
        <>
            <Sidebar>
                <SidebarTrigger className="ml-2 mt-2" />
                <SidebarContent>
                    {/* Member-accessible items (shown to everyone) */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Guild</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {memberItems.map((item) => (
                                    <SidebarMenuItem
                                        key={item.title}
                                        className={`hover:bg-muted ${pathname === item.url || pathname.startsWith(`${item.url}/`) ? "bg-muted" : ""}`}
                                    >
                                        <SidebarMenuButton asChild>
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Officer-only items */}
                    {isOfficer && (
                        <>
                            <SidebarGroup>
                                <SidebarGroupLabel>Preparation</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {preparationItems.map((item) => (
                                            <SidebarMenuItem
                                                key={item.title}
                                                className={`hover:bg-muted ${pathname === item.url ? "bg-muted" : ""}`}
                                            >
                                                <SidebarMenuButton asChild>
                                                    <Link href={item.url}>
                                                        <item.icon />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                            <SidebarGroup>
                                <SidebarGroupLabel>Raid</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {raidItems.map((item) => (
                                            <SidebarMenuItem
                                                key={item.title}
                                                className={`hover:bg-muted ${pathname === item.url ? "bg-muted" : ""}`}
                                            >
                                                <SidebarMenuButton asChild>
                                                    <Link href={item.url}>
                                                        <item.icon />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                            {spreadsheetLinks.length > 0 && (
                                <SidebarGroup>
                                    <SidebarGroupLabel className="flex items-center justify-between">
                                        Spreadsheet
                                        <Link
                                            href="/settings"
                                            className="p-1 rounded hover:bg-muted transition-colors"
                                        >
                                            <Settings className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                        </Link>
                                    </SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {spreadsheetLinks.map((link) => (
                                                <SidebarMenuItem
                                                    key={link.id}
                                                    className={`hover:bg-muted ${pathname === `/spreadsheets/${link.id}` ? "bg-muted" : ""}`}
                                                >
                                                    <SidebarMenuButton asChild>
                                                        <Link
                                                            href={`/spreadsheets/${link.id}`}
                                                        >
                                                            <FileSpreadsheet />
                                                            <span>{link.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            )}
                        </>
                    )}

                    <SidebarGroup className="mt-auto">
                        {isOfficer && (
                            <div className="flex items-center gap-1">
                                <Link
                                    href="/settings"
                                    className="p-2 rounded-full hover:bg-muted w-fit focus:outline-none"
                                    title="Settings"
                                >
                                    <Settings />
                                </Link>
                                <Link
                                    href="/sync"
                                    className="p-2 rounded-full hover:bg-muted w-fit focus:outline-none"
                                    title="Sync"
                                >
                                    <CloudDownload />
                                </Link>
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground px-2 mt-2">
                            {clientEnv.NEXT_PUBLIC_BUILD_ID ?? "dev"}
                        </span>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </>
    )
}
