import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1ClassificationDefinition } from '../../shared/api/classification'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Classification(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1ClassificationDefinition>(
    rpcV1ClassificationDefinition,
    {
      listClassifications: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classifications = await database.classifications.listByUserId(ctx.user.id, input.skip, input.top)
        return { data: classifications }
      },
      listClassificationAssignments: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classifications = await database.classifications.listAssignmentsByUserId(
          ctx.user.id,
          input.skip,
          input.top
        )
        return { data: classifications }
      },
      retrieveClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        return { data: classification }
      },
      createClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.create({ ...input, userId: ctx.user.id })
        return { data: classification }
      },
      updateClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        const classification2 = await database.classifications.update(input)
        return { data: classification2 }
      },
      updateClassificationStatus: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        const classification2 = await database.classifications.update({ ...classification, status: input.status })
        return { data: classification2 }
      },
      deleteClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        await database.classifications.delete(input.id)
        return { data: undefined }
      },
    }
  )
}
