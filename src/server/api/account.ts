import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1AccountDefinition } from '../../shared/api/account'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Account(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1AccountDefinition>(rpcV1AccountDefinition, {
    listAccounts: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const accounts = await database.accounts.listByUserId(ctx.user.id, input.skip, input.top)
      return { data: accounts }
    },
    retrieveAccount: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      return { data: account }
    },
    createAccount: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.create({ ...input })
      return { data: account }
    },
    updateAccount: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      if (input.currency !== account.currency) {
        const transactionCount = await database.transactions.countForAccountId(input.id)
        if (transactionCount > 0) {
          throw RpcError.badRequest('Currency of accounts with at least one transaction cannot be changed')
        }
      }
      const account2 = await database.accounts.update(input)
      return { data: account2 }
    },
    updateAccountStatus: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      const account2 = await database.accounts.update({ ...account, status: input.status })
      return { data: account2 }
    },
    deleteAccount: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      const transactionCount = await database.transactions.countForAccountId(input.id)
      if (transactionCount > 0) {
        throw RpcError.badRequest('Accounts with at least one transaction cannot be deleted')
      }
      await database.accounts.delete(input.id)
      return { data: undefined }
    },
  })
}
