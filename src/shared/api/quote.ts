import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { quoteSchema } from '../models/Quote'
import { byIdSchema, dateStringSchema, listResponseSchema, responseSchema } from '../utils/schemas'

export const rpcV1QuoteDefinition = {
  listLatestQuotes: createRpcCallDefinition(z.object({ date: z.string().optional() }), listResponseSchema(quoteSchema)),
  listQuotesForAsset: createRpcCallDefinition(byIdSchema, listResponseSchema(quoteSchema)),
  retrieveQuoteForAsset: createRpcCallDefinition(
    byIdSchema.extend({ date: dateStringSchema }),
    responseSchema(quoteSchema.nullable())
  ),
  updateQuoteForAsset: createRpcCallDefinition(quoteSchema, z.void()),
  deleteQuoteForAsset: createRpcCallDefinition(byIdSchema.extend({ date: dateStringSchema }), z.void()),
  updateQuotes: createRpcCallDefinition(
    z.void(),
    responseSchema(z.object({ assetQuotesUpdates: z.array(z.string()) }))
  ),
}
