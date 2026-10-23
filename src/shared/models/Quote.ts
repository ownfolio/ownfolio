import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { dateFormat } from '../utils/date'
import { bigNumberSchema } from '../utils/schemas'

export const quoteSchema = z
  .object({
    assetId: z.string().describe('ID of the asset'),
    date: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})$/)
      .describe('Trading day (YYYY-MM-DD), there is at most one quote per asset and day'),
    open: bigNumberSchema.nullable().default(null).describe('Opening price per unit, optional'),
    high: bigNumberSchema.nullable().default(null).describe('Highest price per unit, optional'),
    low: bigNumberSchema.nullable().default(null).describe('Lowest price per unit, optional'),
    close: bigNumberSchema.describe(
      'Closing price per unit in the asset currency. This is the price used to value holdings'
    ),
  })
  .describe('Daily price of one unit of an asset')

export type Quote = z.infer<typeof quoteSchema>

export function createEmptyQuote(assetId: string): Quote {
  return {
    assetId,
    date: dateFormat(new Date(), 'yyyy-MM-dd'),
    open: null,
    high: null,
    low: null,
    close: BigNumber(0),
  }
}
