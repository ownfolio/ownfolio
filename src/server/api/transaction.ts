import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { transactionSchema, transactionSearchSchema } from '../../shared/models/Transaction'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, pagingParamsSchema } from './utils'

const createTransactionSchema = transactionSchema.omit({ id: true, userId: true, createdAt: true })
const updateTransactionSchema = transactionSchema

export function createRpcV1Transaction(database: Database) {
  return {
    listTransactions: createRpcCall(
      transactionSearchSchema.extend(pagingParamsSchema.shape),
      z.array(transactionSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transactions = await database.transactions.listByUserId(ctx.user.id, input, 'desc', input.skip, input.top)
        return transactions
      }
    ),
    retrieveTransaction: createRpcCall(byIdSchema, transactionSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.find(input.id)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.id}`)
      return transaction
    }),
    createTransaction: createRpcCall(createTransactionSchema, transactionSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.create({ ...input, userId: ctx.user.id })
      return transaction
    }),
    updateTransaction: createRpcCall(updateTransactionSchema, transactionSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.find(input.id)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.id}`)
      const transaction2 = await database.transactions.update(input)
      return transaction2
    }),
    deleteTransaction: createRpcCall(byIdSchema, z.void(), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transaction = await database.transactions.find(input.id)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.id}`)
      await database.transactions.delete(input.id)
    }),
  }
}
