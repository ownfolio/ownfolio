import { z } from 'zod'

export const portfolioSchema = z
  .object({
    id: z.string().describe('ID of the portfolio'),
    userId: z.string().describe('ID of the owning user, set by the server'),
    name: z.string().trim().min(1).max(128).describe('Display name, e.g. "Retirement"'),
    status: z
      .enum(['active', 'inactive', 'hidden'])
      .default('active')
      .describe(
        'active: in regular use; inactive: kept for history but no longer used; hidden: additionally hidden in the web app'
      ),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'A group of accounts, e.g. to separate retirement savings from trading. Values can be evaluated per portfolio'
  )

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
