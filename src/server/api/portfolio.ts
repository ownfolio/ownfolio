import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { portfolioSchema } from '../../shared/models/Portfolio'
import { Database } from '../database'
import { RpcCtx } from './context'
import { byIdSchema, pagingParamsSchema } from './utils'

const createPortfolioSchema = portfolioSchema.omit({ id: true, userId: true, createdAt: true })
const updatePortfolioSchema = portfolioSchema

export function createRpcV1Portfolio(database: Database) {
  return {
    listPortfolios: createRpcCall(pagingParamsSchema, z.array(portfolioSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolios = await database.portfolios.listByUserId(ctx.user.id, input.skip, input.top)
      return portfolios
    }),
    retrievePortfolio: createRpcCall(byIdSchema, portfolioSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      return portfolio
    }),
    createPortfolio: createRpcCall(createPortfolioSchema, portfolioSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.create({ ...input, userId: ctx.user.id })
      return portfolio
    }),
    updatePortfolio: createRpcCall(updatePortfolioSchema, portfolioSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      const portfolio2 = await database.portfolios.update(input)
      return portfolio2
    }),
    deletePortfolio: createRpcCall(byIdSchema, z.void(), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      const transactionCount = await database.transactions.countForPortfolioId(input.id)
      if (transactionCount > 0) {
        throw RpcError.badRequest('Portfolios with at least one transaction cannot be deleted')
      }
      await database.portfolios.delete(input.id)
    }),
  }
}
