import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1TransactionDefinition } from '../../shared/api/transaction'
import { TransactionData } from '../../shared/models/Transaction'
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
        await verifyTransactionDataReferences(database, ctx.user.id, input.data)
        const transaction = await database.transactions.create({ ...input, userId: ctx.user.id })
        return { data: transaction }
      },
      updateTransaction: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transaction = await database.transactions.find(input.id)
        if (!transaction || transaction.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown transaction ${input.id}`)
        await verifyTransactionDataReferences(database, ctx.user.id, input.data)
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

const transactionDataAccountIdKeys = [
  'cashAccountId',
  'fromCashAccountId',
  'toCashAccountId',
  'assetAccountId',
  'fromAssetAccountId',
  'toAssetAccountId',
] as const

async function verifyTransactionDataReferences(database: Database, userId: string, data: TransactionData) {
  const record = data as Partial<Record<(typeof transactionDataAccountIdKeys)[number] | 'assetId', string>>
  for (const key of transactionDataAccountIdKeys) {
    const accountId = record[key]
    if (accountId === undefined) continue
    const account = await database.accounts.find(accountId)
    const portfolio = await database.portfolios.find(account?.portfolioId || '')
    if (!account || !portfolio || portfolio.userId !== userId) throw RpcError.badRequest(`Unknown account ${accountId}`)
  }
  if (record.assetId !== undefined) {
    const asset = await database.assets.find(record.assetId)
    if (!asset || (!!asset.userId && asset.userId !== userId))
      throw RpcError.badRequest(`Unknown asset ${record.assetId}`)
  }
}
