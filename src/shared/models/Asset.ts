import { z } from 'zod'

export const assetQuoteProviderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('yahooFinance'),
    symbol: z.string().min(1),
    pauseUntil: z.string().datetime().nullable().default(null),
  }),
])

export type AssetQuoteProvider = z.infer<typeof assetQuoteProviderSchema>

export const assetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().trim().min(1).max(128),
  number: z
    .string()
    .trim()
    .max(128)
    .regex(/^[0-9a-zA-Z\s]*$/)
    .transform(s => s.replace(/\s/g, ''))
    .default(''),
  symbol: z.string().trim().min(1).max(8).toUpperCase(),
  denomination: z.number().int().min(0).max(20).default(0),
  currency: z
    .string()
    .trim()
    .min(1)
    .max(4)
    .toUpperCase()
    .refine(currency => currency === 'EUR', 'Only EUR is supported currently'),
  quoteProvider: assetQuoteProviderSchema.nullable().default(null),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Asset = z.infer<typeof assetSchema>

export function createEmptyAsset(): Asset {
  return {
    id: '',
    userId: '',
    name: '',
    number: '',
    symbol: '',
    denomination: 0,
    currency: 'EUR',
    quoteProvider: null,
    status: 'active',
    createdAt: '',
  }
}
