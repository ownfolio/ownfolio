import { createRpcCall, RpcError } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { classificationAssignmentSchema, classificationSchema } from '../../shared/models/Classification'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from './utils'

const createClassificationSchema = classificationSchema.omit({ id: true, userId: true, createdAt: true })
const updateClassificationSchema = classificationSchema

export function createRpcV1Classification(database: Database) {
  return {
    listClassifications: createRpcCall(
      pagingParamsSchema,
      listResponseSchema(classificationSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classifications = await database.classifications.listByUserId(ctx.user.id, input.skip, input.top)
        return { data: classifications }
      }
    ),
    listClassificationAssignments: createRpcCall(
      pagingParamsSchema,
      listResponseSchema(classificationAssignmentSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classifications = await database.classifications.listAssignmentsByUserId(
          ctx.user.id,
          input.skip,
          input.top
        )
        return { data: classifications }
      }
    ),
    retrieveClassification: createRpcCall(
      byIdSchema,
      responseSchema(classificationSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        return { data: classification }
      }
    ),
    createClassification: createRpcCall(
      createClassificationSchema,
      responseSchema(classificationSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.create({ ...input, userId: ctx.user.id })
        return { data: classification }
      }
    ),
    updateClassification: createRpcCall(
      updateClassificationSchema,
      responseSchema(classificationSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        const classification2 = await database.classifications.update(input)
        return { data: classification2 }
      }
    ),
    updateClassificationStatus: createRpcCall(
      updateClassificationSchema.pick({ id: true, status: true }),
      responseSchema(classificationSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.id)
        if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        const classification2 = await database.classifications.update({ ...classification, status: input.status })
        return { data: classification2 }
      }
    ),
    deleteClassification: createRpcCall(byIdSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const classification = await database.classifications.find(input.id)
      if (!classification || (!!classification.userId && classification.userId !== ctx.user.id))
        throw RpcError.badRequest(`Unknown classification ${input.id}`)
      await database.classifications.delete(input.id)
      return {}
    }),
  }
}
