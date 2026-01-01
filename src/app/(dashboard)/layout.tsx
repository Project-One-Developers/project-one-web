import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AppSidebar from "@/components/app-sidebar"
import { GlobalFilterProvider } from "@/components/global-filter-provider"
import { SidebarProvider } from "@/components/ui/sidebar"

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

    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <GlobalFilterProvider>
                <main className="flex-1 overflow-auto">{children}</main>
            </GlobalFilterProvider>
        </SidebarProvider>
    )
}
