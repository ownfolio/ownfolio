import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { accountSchema } from '../../shared/models/Account'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, pagingParamsSchema } from './utils'

const createAccountSchema = accountSchema.omit({ id: true, createdAt: true })
const updateAccountSchema = accountSchema

export function createRpcV1Account(database: Database) {
  return {
    listAccounts: createRpcCall(pagingParamsSchema, z.array(accountSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const accounts = await database.accounts.listByUserId(ctx.user.id, input.skip, input.top)
      return accounts
    }),
    retrieveAccount: createRpcCall(byIdSchema, accountSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.find(input.id)
      const portfolio = await database.portfolios.find(account?.portfolioId || '')
      if (!account || !portfolio || portfolio.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown account ${input.id}`)
      return account
    }),
    createAccount: createRpcCall(createAccountSchema, accountSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const account = await database.accounts.create({ ...input })
      return account
    }),
    updateAccount: createRpcCall(updateAccountSchema, accountSchema, async (ctx: RpcCtx, input) => {
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
      return account2
    }),
    updateAccountStatus: createRpcCall(
      updateAccountSchema.pick({ id: true, status: true }),
      accountSchema,
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const account = await database.accounts.find(input.id)
        const portfolio = await database.portfolios.find(account?.portfolioId || '')
        if (!account || !portfolio || portfolio.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown account ${input.id}`)
        const account2 = await database.accounts.update({ ...account, status: input.status })
        return account2
      }
    ),
    deleteAccount: createRpcCall(byIdSchema, z.void(), async (ctx: RpcCtx, input) => {
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
    }),
  }
}
