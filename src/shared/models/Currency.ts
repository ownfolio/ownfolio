import { z } from 'zod'

export const currencySymbolSchema = z.enum(['USD', 'EUR'])

export type CurrencySymbol = z.infer<typeof currencySymbolSchema>

export const currencySchema = z.object({
  name: z.string(),
  symbol: currencySymbolSchema,
  denomination: z.number(),
})

export type Currency = z.infer<typeof currencySchema>

export const allCurrencies: Currency[] = [{ name: 'Euro', symbol: 'EUR', denomination: 2 }]

export const rootCurrency: Currency = allCurrencies[0]
