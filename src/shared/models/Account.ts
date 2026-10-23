import { z } from 'zod'

import { currenciesList, rootCurrency } from './Currency'

export const accountSchema = z
  .object({
    id: z.string().describe('ID of the account'),
    portfolioId: z.string().describe('ID of the portfolio the account belongs to'),
    name: z.string().trim().min(1).max(128).describe('Display name, e.g. "Broker X Depot" or "Bank Y Checking"'),
    number: z
      .string()
      .trim()
      .max(128)
      .regex(/^[0-9a-zA-Z\s]*$/)
      .default('')
      .describe('Optional account number at the bank or broker (e.g. an IBAN), only letters, digits and spaces'),
    currency: z
      .string()
      .trim()
      .min(1)
      .max(4)
      .toUpperCase()
      .refine(
        currency => currenciesList.find(c => c.symbol === currency),
        `Currency must be one of ${currenciesList.map(c => c.symbol).join(', ')}`
      )
      .describe(
        `Currency of all cash amounts booked on this account, one of ${currenciesList.map(c => c.symbol).join(', ')}. Cannot be changed once the account has transactions`
      ),
    status: z
      .enum(['active', 'inactive', 'hidden'])
      .default('active')
      .describe(
        'active: in regular use; inactive: kept for history but no longer used; hidden: additionally hidden in the web app'
      ),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'An account at a bank or broker inside a portfolio. The same account can hold cash and assets (e.g. a brokerage depot), transactions reference accounts as cash and/or asset accounts'
  )

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
