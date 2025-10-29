import { z } from 'zod'

export const currencySymbolSchema = z.enum(['EUR'])

export type CurrencySymbol = z.infer<typeof currencySymbolSchema>

export const currencySchema = z.object({
  name: z.string(),
  symbol: currencySymbolSchema,
  denomination: z.number(),
})

export type Currency = z.infer<typeof currencySchema>

export const currencies: Record<CurrencySymbol, Currency> = {
  EUR: { name: 'Euro', symbol: 'EUR', denomination: 2 },
}
export const currenciesList: Currency[] = Object.keys(currencies).map(symbol => currencies[symbol as CurrencySymbol])

export const rootCurrency: Currency = currencies.EUR
