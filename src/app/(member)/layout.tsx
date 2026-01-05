import { auth } from "@/auth"
import AppSidebar from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UserRoleProvider } from "@/lib/user-role-context"
import { spreadsheetLinkService } from "@/services/spreadsheet-link.service"

// Auth protection handled by proxy (src/auth.config.ts)
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()

    // Session with role is guaranteed by proxy - this is a safeguard
    if (!session?.user.role) {
        throw new Error("MemberLayout requires authenticated session with role")
    }

    const { role } = session.user

    // Fetch spreadsheet links for officers (members won't see them anyway)
    const spreadsheetLinks =
        role === "officer" ? await spreadsheetLinkService.getList() : []

    return (
        <UserRoleProvider role={role}>
            <SidebarProvider defaultOpen={true}>
                <AppSidebar userRole={role} spreadsheetLinks={spreadsheetLinks} />
                <main className="flex-1 overflow-auto">{children}</main>
            </SidebarProvider>
        </UserRoleProvider>
    )
}
