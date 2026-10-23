import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { quoteSchema } from '../models/Quote'
import { byIdSchemaFor, dateStringSchema, listResponseSchema, responseSchema } from '../utils/schemas'

export const rpcV1QuoteDefinition = {
  listLatestQuotes: createRpcCallDefinition(
    z.object({
      date: dateStringSchema
        .optional()
        .describe('Only consider quotes on or before this date (YYYY-MM-DD), defaults to the latest quotes'),
    }),
    listResponseSchema(quoteSchema)
  ),
  listQuotesForAsset: createRpcCallDefinition(byIdSchemaFor('asset'), listResponseSchema(quoteSchema)),
  retrieveQuoteForAsset: createRpcCallDefinition(
    byIdSchemaFor('asset').extend({
      date: dateStringSchema.describe('Return the latest quote on or before this date (YYYY-MM-DD)'),
    }),
    responseSchema(quoteSchema.nullable())
  ),
  updateQuoteForAsset: createRpcCallDefinition(quoteSchema, z.void()),
  deleteQuoteForAsset: createRpcCallDefinition(
    byIdSchemaFor('asset').extend({ date: dateStringSchema.describe('Date of the quote to delete (YYYY-MM-DD)') }),
    z.void()
  ),
  updateQuotes: createRpcCallDefinition(
    z.void(),
    responseSchema(z.object({ assetQuotesUpdates: z.array(z.string()) }))
  ),
}
