import { z } from 'zod'

export const portfolioSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().trim().min(1).max(128),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Portfolio = z.infer<typeof portfolioSchema>

export function createEmptyPortfolio(): Portfolio {
  return {
    id: '',
    userId: '',
    name: '',
    status: 'active',
    createdAt: '',
  }
}
