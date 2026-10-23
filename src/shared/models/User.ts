import { z } from 'zod'

export const userSchema = z
  .object({
    id: z.string().describe('ID of the user'),
    email: z.string().trim().max(256).email().toLowerCase().describe('Email address used to log in'),
    createdAt: z.string().datetime().describe('Registration timestamp (ISO 8601)'),
  })
  .describe('The logged in user. All data is private to the user')

export type User = z.infer<typeof userSchema>
