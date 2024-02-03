import { z } from 'zod'

export const byIdSchema = z.object({ id: z.string() })

export const pagingParamsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  top: z.number().int().min(1).optional(),
})
