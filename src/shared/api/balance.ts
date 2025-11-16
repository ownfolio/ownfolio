import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { balanceSchema } from '../models/Balance'
import { dateUnitSchema } from '../utils/date'
import { dateStringSchema, listResponseSchema } from '../utils/schemas'

export const rpcV1BalanceDefinition = {
  evaluateBalances: createRpcCallDefinition(
    z.object({
      when: z.discriminatedUnion('type', [
        z.object({ type: z.literal('now') }),
        z.object({ type: z.literal('dates'), dates: z.array(dateStringSchema).min(1) }),
        z.object({ type: z.literal('historical'), resolution: dateUnitSchema.optional() }),
      ]),
    }),
    listResponseSchema(balanceSchema)
  ),
}
