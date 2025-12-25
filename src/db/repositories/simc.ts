import { db } from "@/db"
import { simcTable } from "@/db/schema"
import { conflictUpdateAllExcept } from "@/db/utils"
import { simcSchema } from "@/shared/schemas/simulations.schemas"
import type { SimC } from "@/shared/types/types"
import { z } from "zod"

export async function getAllSimC(): Promise<SimC[]> {
    const result = await db.query.simcTable.findMany()
    return z.array(simcSchema).parse(result)
}

export async function getSimCByCharacter(
    charName: string,
    charRealm: string
): Promise<SimC | null> {
    const result = await db.query.simcTable.findFirst({
        where: (t, { and, eq }) =>
            and(eq(t.charName, charName), eq(t.charRealm, charRealm)),
    })
    return result ? simcSchema.parse(result) : null
}

export async function addSimC(simc: SimC): Promise<void> {
    await db
        .insert(simcTable)
        .values(simc)
        .onConflictDoUpdate({
            target: [simcTable.charName, simcTable.charRealm],
            set: conflictUpdateAllExcept(simcTable, ["charName", "charRealm"]),
        })
}
