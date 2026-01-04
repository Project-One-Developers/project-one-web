"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { UserRole } from "@/shared/models/auth.models"

const UserRoleContext = createContext<UserRole | undefined>(undefined)

export function useUserRole(): UserRole {
    const role = useContext(UserRoleContext)
    if (!role) {
        throw new Error("useUserRole must be used within a UserRoleProvider")
    }
    return role
}

export function UserRoleProvider({
    role,
    children,
}: {
    role: UserRole
    children: ReactNode
}) {
    return <UserRoleContext.Provider value={role}>{children}</UserRoleContext.Provider>
}
