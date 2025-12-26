import { and, eq, or } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { simcTable } from "@/db/schema"
import { conflictUpdateAllExcept } from "@/db/utils"
import { simcSchema } from "@/shared/schemas/simulations.schemas"
import type { SimC } from "@/shared/types/types"

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

export async function getSimcByChars(
    chars: { name: string; realm: string }[]
): Promise<SimC[]> {
    if (chars.length === 0) {
        return []
    }

    const result = await db.query.simcTable.findMany({
        where: or(
            ...chars.map((c) =>
                and(eq(simcTable.charName, c.name), eq(simcTable.charRealm, c.realm))
            )
        ),
    })
    return z.array(simcSchema).parse(result)
}
