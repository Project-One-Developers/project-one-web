import { z } from "zod"
import { itemSchema } from "./item.model"

export const bossSchema = z.object({
    id: z.number(),
    name: z.string(),
    instanceName: z.string(),
    instanceType: z.string(),
    instanceId: z.number(),
    order: z.number(),
    raiderioRaidSlug: z.string().nullish(),
    raiderioEncounterSlug: z.string().nullish(),
})
export type Boss = z.infer<typeof bossSchema>

export const bossWithItemsSchema = bossSchema.extend({
    items: z.array(itemSchema),
})
export type BossWithItems = z.infer<typeof bossWithItemsSchema>
