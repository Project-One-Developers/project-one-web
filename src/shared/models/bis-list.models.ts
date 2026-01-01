import { z } from "zod"
import { itemSchema } from "./item.models"

export const bisListSchema = z.object({
    itemId: itemSchema.shape.id,
    specIds: z.array(z.coerce.number()),
})
export type BisList = z.infer<typeof bisListSchema>
