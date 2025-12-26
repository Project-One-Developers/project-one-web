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

    // Redirect to home if already logged in
    if (session?.user) {
        redirect("/")
    }

    return <div className="min-h-screen flex items-center justify-center">{children}</div>
}
