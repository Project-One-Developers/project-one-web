import { z } from "zod"
import { itemSchema } from "./item.model"

export const bisListSchema = z.object({
    itemId: itemSchema.shape.id,
    specIds: z.array(z.coerce.number()),
})
export type BisList = z.infer<typeof bisListSchema>
