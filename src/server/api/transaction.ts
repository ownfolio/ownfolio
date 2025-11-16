import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1TransactionDefinition } from '../../shared/api/transaction'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Transaction(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1TransactionDefinition>(
    rpcV1TransactionDefinition,
    {
      listTransactions: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transactions = await database.transactions.listByUserId(ctx.user.id, input, 'desc', input.skip, input.top)
        return { data: transactions }
      },
      retrieveTransaction: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.find(input.id)
        if (!transaction || transaction.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown transaction ${input.id}`)
        return { data: transaction }
      },
      createTransaction: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.create({ ...input, userId: ctx.user.id })
        return { data: transaction }
      },
      updateTransaction: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.find(input.id)
        if (!transaction || transaction.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown transaction ${input.id}`)
        const transaction2 = await database.transactions.update(input)
        return { data: transaction2 }
      },
      deleteTransaction: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.find(input.id)
        if (!transaction || transaction.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown transaction ${input.id}`)
        await database.transactions.delete(input.id)
        return { data: undefined }
      },
    }
  )
}
