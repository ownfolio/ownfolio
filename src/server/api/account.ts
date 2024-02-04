import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { accountSchema } from '../../shared/models/Account'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from './utils'

const createAccountSchema = accountSchema.omit({ id: true, createdAt: true })
const updateAccountSchema = accountSchema

export function createRpcV1Account(database: Database) {
  return {
    listAccounts: createRpcCall(pagingParamsSchema, listResponseSchema(accountSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const accounts = await database.accounts.listByUserId(ctx.user.id, input.skip, input.top)
      return { data: accounts }
    }),
    retrieveAccount: createRpcCall(byIdSchema, responseSchema(accountSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      return { data: account }
    }),
    createAccount: createRpcCall(createAccountSchema, responseSchema(accountSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.create({ ...input })
      return { data: account }
    }),
    updateAccount: createRpcCall(updateAccountSchema, responseSchema(accountSchema), async (ctx: RpcCtx, input) => {
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
    }),
    updateAccountStatus: createRpcCall(
      updateAccountSchema.pick({ id: true, status: true }),
      responseSchema(accountSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const account = await database.accounts.find(input.id)
        const portfolio = await database.portfolios.find(account?.portfolioId || '')
        if (!account || !portfolio || portfolio.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown account ${input.id}`)
        const account2 = await database.accounts.update({ ...account, status: input.status })
        return { data: account2 }
      }
    ),
    deleteAccount: createRpcCall(byIdSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
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
      return {}
    }),
  }
}
