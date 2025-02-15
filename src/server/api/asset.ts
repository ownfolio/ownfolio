import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { assetSchema } from '../../shared/models/Asset'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from './utils'

const createAssetSchema = assetSchema.omit({ id: true, userId: true, createdAt: true })
const updateAssetSchema = assetSchema

export function createRpcV1Asset(database: Database) {
  return {
    listAssets: createRpcCall(pagingParamsSchema, listResponseSchema(assetSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const assets = await database.assets.listByUserId(ctx.user.id, input.skip, input.top)
      return { data: assets }
    }),
    retrieveAsset: createRpcCall(byIdSchema, responseSchema(assetSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input.id}`)
      return { data: asset }
    }),
    createAsset: createRpcCall(createAssetSchema, responseSchema(assetSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.create({ ...input, userId: ctx.user.id })
      return { data: asset }
    }),
    updateAsset: createRpcCall(updateAssetSchema, responseSchema(assetSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input.id}`)
      if (input.currency !== asset.currency) {
        const transactionCount = await database.transactions.countForAssetId(input.id)
        if (transactionCount > 0) {
          throw RpcError.badRequest('Currency of assets with at least one transaction cannot be changed')
        }
        const quoteCount = await database.quotes.countForAssetId(input.id)
        if (quoteCount > 0) {
          throw RpcError.badRequest('Currency of assets with at least one quote cannot be changed')
        }
      }
      const asset2 = await database.assets.update(input)
      return { data: asset2 }
    }),
    updateAssetStatus: createRpcCall(
      updateAssetSchema.pick({ id: true, status: true }),
      responseSchema(assetSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const asset = await database.assets.find(input.id)
        if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown asset ${input.id}`)
        const asset2 = await database.assets.update({ ...asset, status: input.status })
        return { data: asset2 }
      }
    ),
    deleteAsset: createRpcCall(byIdSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const asset = await database.assets.find(input.id)
      if (!asset || (!!asset.userId && asset.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown asset ${input.id}`)
      const transactionCount = await database.transactions.countForAssetId(input.id)
      if (transactionCount > 0) {
        throw RpcError.badRequest('Assets with at least one transaction cannot be deleted')
      }
      await database.assets.delete(input.id)
      return {}
    }),
  }
}
