import { z } from 'zod'

export const categorizationSchema = z
  .object({
    id: z.string().describe('ID of the categorization'),
    userId: z.string().describe('ID of the owning user, set by the server'),
    name: z.string().trim().min(1).max(128).describe('Display name, e.g. "Region", "Liquidity" or "Risk profile"'),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'A custom dimension to classify accounts and assets by, e.g. "Region". It contains a tree of categories (e.g. "EU" with the subcategories "Germany" and "France"), to which accounts and assets are assigned with fractions'
  )

export type Categorization = z.infer<typeof categorizationSchema>

export function createEmptyCategorization(): Categorization {
  return {
    id: '',
    userId: '',
    name: '',
    createdAt: '',
  }
}
