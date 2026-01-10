import { auth } from "@/auth"
import AppSidebar from "@/components/app-sidebar"
import { GlobalFilterProvider } from "@/components/global-filter-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { spreadsheetLinkRepo } from "@/db/repositories/spreadsheet-link.repo"
import { UserRoleProvider } from "@/lib/user-role-context"

// Auth + officer role protection handled by proxy (src/auth.config.ts)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()

    // Officer role is guaranteed by proxy - this is a safeguard
    if (session?.user.role !== "officer") {
        throw new Error("AppLayout requires authenticated session with officer role")
    }

    const { role } = session.user

    // Fetch spreadsheet links for sidebar
    const spreadsheetLinks = await spreadsheetLinkRepo.getList()

    return (
        <UserRoleProvider role={role}>
            <SidebarProvider defaultOpen={true}>
                <AppSidebar userRole={role} spreadsheetLinks={spreadsheetLinks} />
                <GlobalFilterProvider>
                    <main className="flex-1 overflow-auto">{children}</main>
                </GlobalFilterProvider>
            </SidebarProvider>
        </UserRoleProvider>
    )
}
