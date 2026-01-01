import type { DefaultSession } from "next-auth"
import type { UserRole } from "@/shared/models/auth.models"

declare module "next-auth" {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Module augmentation requires interface
    interface Session {
        user: {
            id: string
            role: UserRole | undefined // undefined = stale session, must re-auth
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Module augmentation requires interface
    interface JWT {
        role?: UserRole
    }
}
