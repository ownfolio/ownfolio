import { z } from 'zod'

export const byIdSchema = z.object({ id: z.string() })

export const pagingParamsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  top: z.number().int().min(1).optional(),
})

export function responseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  })
}

export function listResponseSchema<T extends z.ZodTypeAny>(elementSchema: T) {
  return z.object({
    data: z.array(elementSchema),
  })
}
