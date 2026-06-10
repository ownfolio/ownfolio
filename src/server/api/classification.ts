import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1ClassificationDefinition } from '../../shared/api/classification'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Classification(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1ClassificationDefinition>(
    rpcV1ClassificationDefinition,
    {
      listClassifications: async ctx => {
        if (!ctx.user) throw RpcError.unauthorized()
        const data = await database.classifications.listByUserId(ctx.user.id)
        return { data }
      },

      createClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const data = await database.classifications.create({ ...input, userId: ctx.user.id, status: 'active' })
        return { data }
      },

      updateClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const existing = await database.classifications.find(input.id)
        if (!existing || existing.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        const data = await database.classifications.update({ ...existing, ...input })
        return { data }
      },

      deleteClassification: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const existing = await database.classifications.find(input.id)
        if (!existing || existing.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.id}`)
        await database.classifications.delete(input.id)
        return { data: undefined }
      },

      listClassificationBuckets: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.classificationId}`)
        const data = await database.classifications.listBucketsByClassificationId(input.classificationId)
        return { data }
      },

      createClassificationBucket: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.classificationId}`)
        const data = await database.classifications.createBucket(input)
        return { data }
      },

      updateClassificationBucket: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const bucket = await database.classifications.findBucket(input.id)
        if (!bucket) throw RpcError.badRequest(`Unknown bucket ${input.id}`)
        const classification = await database.classifications.find(bucket.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${bucket.classificationId}`)
        const data = await database.classifications.updateBucket(input)
        return { data }
      },

      deleteClassificationBucket: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const bucket = await database.classifications.findBucket(input.id)
        if (!bucket) throw RpcError.badRequest(`Unknown bucket ${input.id}`)
        const classification = await database.classifications.find(bucket.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${bucket.classificationId}`)
        await database.classifications.deleteBucket(input.id)
        return { data: undefined }
      },

      listClassificationAssignments: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.classificationId}`)
        const data = await database.classifications.listAssignmentsByClassificationId(input.classificationId)
        return { data }
      },

      listAllClassificationAssignments: async ctx => {
        if (!ctx.user) throw RpcError.unauthorized()
        const data = await database.classifications.listAllAssignmentsByUserId(ctx.user.id)
        return { data }
      },

      setClassificationBucketAssignment: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const classification = await database.classifications.find(input.classificationId)
        if (!classification || classification.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown classification ${input.classificationId}`)
        if (input.bucketId !== null) {
          const bucket = await database.classifications.findBucket(input.bucketId)
          if (!bucket || bucket.classificationId !== input.classificationId)
            throw RpcError.badRequest(`Unknown bucket ${input.bucketId}`)
        }
        await database.classifications.setAssignment(
          input.classificationId,
          input.entityType,
          input.entityId,
          input.bucketId
        )
        return { data: undefined }
      },
    }
  )
}
