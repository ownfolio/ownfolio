import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { quoteSchema } from '../../shared/models/Quote'
import { filterNotFalse } from '../../shared/utils/array'
import { Database } from '../database'
import { logger } from '../logger'
import { updateAssetQuotes } from '../quotes'
import { RpcCtx } from './context'
import { byIdSchema } from './utils'

export function createRpcV1Quote(database: Database) {
  return {
    listLatestQuotes: createRpcCall(
      z.object({ date: z.string().optional() }),
      z.array(quoteSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const lastestQuotes = await database.quotes.listLatestClosesByUserId(ctx.user.id, input.date || undefined)
        return lastestQuotes
      }
    ),
    listQuotesForAsset: createRpcCall(byIdSchema, z.array(quoteSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input}`)
      const quotes = await database.quotes.listByAssetId(input.id)
      return quotes
    }),
    retrieveQuoteForAsset: createRpcCall(
      byIdSchema.extend({ date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/) }),
      quoteSchema.nullable(),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const asset = await database.assets.find(input.id)
        if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown asset ${input}`)
        const quotes = await database.quotes.listByAssetId(input.id)
        return quotes.reverse().find(quote => quote.date <= input.date) || null
      }
    ),
    updateQuotes: createRpcCall(
      z.void(),
      z.object({ assetQuotesUpdates: z.array(z.string()) }),
      async (ctx: RpcCtx) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const assets = await database.assets.listByUserId(ctx.user.id)
        const assetQuotesUpdates = await Promise.all(
          assets.map(async asset => {
            try {
              const didUpdate = await updateAssetQuotes(database, asset)
              return didUpdate ? asset.id : false
            } catch (error) {
              logger.error(`Failed to update quotes for asset ${asset.id}`, { error })
              return false
            }
          })
        )
        return {
          assetQuotesUpdates: filterNotFalse(assetQuotesUpdates),
        }
      }
    ),
  }
}
