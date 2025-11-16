import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1QuoteDefinition } from '../../shared/api/quote'
import { filterNotFalse } from '../../shared/utils/array'
import { Database } from '../database'
import { logger } from '../logger'
import { updateAssetQuotes } from '../quotes'
import { RpcCtx } from './context'

export function createRpcV1Quote(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1QuoteDefinition>(rpcV1QuoteDefinition, {
    listLatestQuotes: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const lastestQuotes = await database.quotes.listLatestClosesByUserId(ctx.user.id, input.date || undefined)
      return { data: lastestQuotes }
    },
    listQuotesForAsset: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input}`)
      const quotes = await database.quotes.listByAssetId(input.id)
      return { data: quotes }
    },
    retrieveQuoteForAsset: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input}`)
      const quotes = await database.quotes.listByAssetId(input.id)
      return { data: quotes.reverse().find(quote => quote.date <= input.date) || null }
    },
    updateQuoteForAsset: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.assetId)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input}`)
      await database.quotes.createOrUpdate(input)
    },
    deleteQuoteForAsset: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input}`)
      await database.quotes.delete(input.id, input.date)
    },
    updateQuotes: async ctx => {
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
        data: {
          assetQuotesUpdates: filterNotFalse(assetQuotesUpdates),
        },
      }
    },
  })
}
