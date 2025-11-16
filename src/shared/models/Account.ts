import { z } from 'zod'

import { currenciesList, rootCurrency } from './Currency'

export const accountSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  name: z.string().trim().min(1).max(128),
  number: z
    .string()
    .trim()
    .max(128)
    .regex(/^[0-9a-zA-Z\s]*$/)
    .default(''),
  currency: z
    .string()
    .trim()
    .min(1)
    .max(4)
    .toUpperCase()
    .refine(
      currency => currenciesList.find(c => c.symbol === currency),
      `Currency must be one of ${currenciesList.map(c => c.symbol).join(', ')}`
    ),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Account = z.infer<typeof accountSchema>

export function createEmptyAccount(): Account {
  return {
    id: '',
    portfolioId: '',
    name: '',
    number: '',
    currency: rootCurrency.symbol,
    status: 'active',
    createdAt: '',
  }
}
