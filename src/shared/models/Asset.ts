import { z } from 'zod'

import { currenciesList, rootCurrency } from './Currency'

export const assetQuoteProviderSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('yahooFinance').describe('Fetch daily quotes from Yahoo Finance'),
      symbol: z
        .string()
        .min(1)
        .describe('Ticker symbol on Yahoo Finance including the exchange suffix, e.g. "VWCE.DE"'),
      pauseUntil: z
        .string()
        .datetime()
        .nullable()
        .default(null)
        .describe(
          'Timestamp (ISO 8601) until which no quotes are fetched, managed by the server. Pass null or the current value'
        ),
    }),
  ])
  .describe('Source from which updateQuotes fetches quotes for the asset automatically')

export type AssetQuoteProvider = z.infer<typeof assetQuoteProviderSchema>

export const assetSchema = z
  .object({
    id: z.string().describe('ID of the asset'),
    userId: z.string().describe('ID of the owning user, set by the server'),
    name: z.string().trim().min(1).max(128).describe('Display name, e.g. "Vanguard FTSE All-World UCITS ETF"'),
    number: z
      .string()
      .trim()
      .max(128)
      .regex(/^[0-9a-zA-Z\s]*$/)
      .default('')
      .describe('Optional security identification number such as ISIN or WKN, only letters, digits and spaces'),
    symbol: z.string().trim().min(1).max(8).toUpperCase().describe('Short ticker-like symbol shown next to amounts'),
    denomination: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(0)
      .describe(
        'Number of decimal places used to display amounts of this asset, e.g. 0 for whole shares or 8 for crypto. Does not limit the precision that can be stored'
      ),
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
        `Currency the asset is quoted in, one of ${currenciesList.map(c => c.symbol).join(', ')}. Cannot be changed once the asset has transactions or quotes`
      ),
    quoteProvider: assetQuoteProviderSchema
      .nullable()
      .default(null)
      .describe('Automatic quote source, or null if quotes are maintained manually via updateQuoteForAsset'),
    status: z
      .enum(['active', 'inactive', 'hidden'])
      .default('active')
      .describe(
        'active: in regular use; inactive: kept for history but no longer used; hidden: additionally hidden in the web app'
      ),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'A tradable instrument such as a stock, ETF, bond or cryptocurrency. Assets belong to the user and are not tied to a portfolio or account, holdings arise from transactions'
  )

export type Asset = z.infer<typeof assetSchema>

export function createEmptyAsset(): Asset {
  return {
    id: '',
    userId: '',
    name: '',
    number: '',
    symbol: '',
    denomination: 0,
    currency: rootCurrency.symbol,
    quoteProvider: null,
    status: 'active',
    createdAt: '',
  }
}
