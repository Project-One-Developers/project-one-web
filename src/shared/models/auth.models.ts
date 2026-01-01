import { z } from "zod"

export const userRoleSchema = z.enum(["officer", "member"])
export type UserRole = z.infer<typeof userRoleSchema>
