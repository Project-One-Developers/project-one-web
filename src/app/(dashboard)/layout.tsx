import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AppSidebar from "@/components/app-sidebar"
import { GlobalFilterProvider } from "@/components/global-filter-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UserRoleProvider } from "@/lib/user-role-context"
import { spreadsheetLinkService } from "@/services/spreadsheet-link.service"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    let session
    try {
        session = await auth()
    } catch {
        redirect("/login")
    }

    if (!session?.user) {
        redirect("/login")
    }

    // No role = stale session, force re-auth
    if (!session.user.role) {
        redirect("/login")
    }

    // Only officers can access dashboard routes
    if (session.user.role !== "officer") {
        redirect("/")
    }

    // Fetch spreadsheet links for sidebar
    const spreadsheetLinks = await spreadsheetLinkService.getList()

    return (
        <UserRoleProvider role={session.user.role}>
            <SidebarProvider defaultOpen={true}>
                <AppSidebar
                    userRole={session.user.role}
                    spreadsheetLinks={spreadsheetLinks}
                />
                <GlobalFilterProvider>
                    <main className="flex-1 overflow-auto">{children}</main>
                </GlobalFilterProvider>
            </SidebarProvider>
        </UserRoleProvider>
    )
}
