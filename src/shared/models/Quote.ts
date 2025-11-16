import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { dateFormat } from '../utils/date'
import { bigNumberSchema } from '../utils/schemas'

export const quoteSchema = z.object({
  assetId: z.string(),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/),
  open: bigNumberSchema.nullable().default(null),
  high: bigNumberSchema.nullable().default(null),
  low: bigNumberSchema.nullable().default(null),
  close: bigNumberSchema,
})

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
