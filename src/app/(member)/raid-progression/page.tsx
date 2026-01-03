import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { RaidProgressionPageClient } from "./raid-progression-client"

export default async function RaidProgressionPage() {
    const session = await auth()

    if (!session?.user.role) {
        redirect("/login")
    }

    return <RaidProgressionPageClient userRole={session.user.role} />
}
