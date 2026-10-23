import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { balanceSchema } from '../models/Balance'
import { dateUnitSchema } from '../utils/date'
import { dateStringSchema, listResponseSchema } from '../utils/schemas'

export const rpcV1BalanceDefinition = {
  evaluateBalances: createRpcCallDefinition(
    z.object({
      when: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('now').describe('A single evaluation for today') }),
          z.object({
            type: z.literal('dates').describe('One evaluation per given date'),
            dates: z.array(dateStringSchema).min(1).describe('Dates (YYYY-MM-DD) to evaluate at, in ascending order'),
          }),
          z.object({
            type: z
              .literal('historical')
              .describe('A time series from the date of the first transaction until today, always including today'),
            resolution: dateUnitSchema.optional().describe('Distance between two evaluated dates, defaults to day'),
          }),
        ])
        .describe('Dates to evaluate at. Each evaluation includes all transactions up to the end of its date'),
    }),
    listResponseSchema(balanceSchema)
  ),
}
