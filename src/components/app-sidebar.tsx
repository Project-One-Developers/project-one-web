"use client"

import {
    FileSpreadsheet,
    LucideAccessibility,
    LucideBot,
    LucideGauge,
    LucideCpu,
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

const spreadsheetItems = [
    {
        title: "Split",
        url: "https://docs.google.com/spreadsheets/d/1kA2AIMB65xXnOY-dHKhOkaecwbmymdXP_jLg1Bu7xTI/edit?gid=2067098323#gid=2067098323",
        icon: FileSpreadsheet,
    },
    {
        title: "Farm 11.1",
        url: "https://docs.google.com/spreadsheets/d/1U8kKbRJQ13-cdH93otDlmc-6qbzQ1g55q9lRokvwSME/edit?pli=1&gid=0#gid=0",
        icon: FileSpreadsheet,
    },
    {
        title: "Ulria PI/Tier",
        url: "https://docs.google.com/spreadsheets/d/1exJeu5eVe4bTmyg3WFx5PTxIWvDLi0j-WW-XWpGoG88/htmlview?gid=8138119#",
        icon: FileSpreadsheet,
    },
    {
        title: "WoW Audit",
        url: "https://docs.google.com/spreadsheets/d/1oXDiksY6UFl6QEW0cFqF0iuxUE3ZM3g5WrrCBIx4OTA/edit?gid=0#gid=0",
        icon: FileSpreadsheet,
    },
]

export default function AppSidebar(): JSX.Element {
    const pathname = usePathname()
    const { open } = useSidebar()

    if (!open) {
        return <SidebarTrigger className="absolute left-2 top-2 z-10" />
    }

    return (
        <>
            <Sidebar>
                <SidebarTrigger className="ml-2 mt-2" />
                <SidebarContent>
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
                    <SidebarGroup>
                        <SidebarGroupLabel>Spreadsheet</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {spreadsheetItems.map((item) => (
                                    <SidebarMenuItem
                                        key={item.title}
                                        className="hover:bg-muted"
                                    >
                                        <SidebarMenuButton asChild>
                                            <a
                                                href={item.url}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarGroup className="mt-auto">
                        <Link
                            href="/config"
                            className="p-2 rounded-full hover:bg-muted w-fit focus:outline-none"
                        >
                            <Settings />
                        </Link>
                        <span className="text-xs text-muted-foreground px-2 mt-2">
                            {clientEnv.NEXT_PUBLIC_BUILD_ID ?? "dev"}
                        </span>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </>
    )
}
