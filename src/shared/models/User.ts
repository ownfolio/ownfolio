import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  email: z.string().trim().max(256).email().toLowerCase(),
  createdAt: z.string().datetime(),
})

export type User = z.infer<typeof userSchema>
