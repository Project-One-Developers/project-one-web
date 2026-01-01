import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AppSidebar from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
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

    // Both officers and members can access these routes

    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar userRole={session.user.role} />
            <main className="flex-1 overflow-auto">{children}</main>
        </SidebarProvider>
    )
}
