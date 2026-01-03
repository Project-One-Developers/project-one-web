import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    let session
    try {
        session = await auth()
    } catch {
        // Auth error - allow access to login page
        session = null
    }

    // Only redirect if logged in with a valid role
    // Stale sessions (no role) stay on login - re-authenticating will fix them
    if (session?.user.role) {
        redirect("/")
    }

    return <div className="min-h-screen flex items-center justify-center">{children}</div>
}
