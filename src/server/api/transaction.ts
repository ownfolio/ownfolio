import { createRpcCall, RpcError } from '@ownfolio/rpc-core'
import { z } from 'zod'

import {
  transactionSchema,
  transactionSearchResultSchema,
  transactionSearchSchema,
} from '../../shared/models/Transaction'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from './utils'

const createTransactionSchema = transactionSchema.omit({ id: true, userId: true, createdAt: true })
const updateTransactionSchema = transactionSchema

export function createRpcV1Transaction(database: Database) {
  return {
    listTransactions: createRpcCall(
      transactionSearchSchema.extend(pagingParamsSchema.shape),
      listResponseSchema(transactionSearchResultSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transactions = await database.transactions.listByUserId(ctx.user.id, input, 'desc', input.skip, input.top)
        return { data: transactions }
      }
    ),
    retrieveTransaction: createRpcCall(byIdSchema, responseSchema(transactionSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.find(input.id)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.id}`)
      return { data: transaction }
    }),
    createTransaction: createRpcCall(
      createTransactionSchema,
      responseSchema(transactionSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.create({ ...input, userId: ctx.user.id })
        return { data: transaction }
      }
    ),
    updateTransaction: createRpcCall(
      updateTransactionSchema,
      responseSchema(transactionSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.find(input.id)
        if (!transaction || transaction.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown transaction ${input.id}`)
        const transaction2 = await database.transactions.update(input)
        return { data: transaction2 }
      }
    ),
    deleteTransaction: createRpcCall(byIdSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.find(input.id)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.id}`)
      await database.transactions.delete(input.id)
      return {}
    }),
  }
}
