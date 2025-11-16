import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1PortfolioDefinition } from '../../shared/api/portfolio'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Portfolio(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1PortfolioDefinition>(rpcV1PortfolioDefinition, {
    listPortfolios: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolios = await database.portfolios.listByUserId(ctx.user.id, input.skip, input.top)
      return { data: portfolios }
    },
    retrievePortfolio: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      return { data: portfolio }
    },
    createPortfolio: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.create({ ...input, userId: ctx.user.id })
      return { data: portfolio }
    },
    updatePortfolio: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      const portfolio2 = await database.portfolios.update(input)
      return { data: portfolio2 }
    },
    updatePortfolioStatus: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      const portfolio2 = await database.portfolios.update({ ...portfolio, status: input.status })
      return { data: portfolio2 }
    },
    deletePortfolio: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const portfolio = await database.portfolios.find(input.id)
      if (!portfolio || portfolio.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown portfolio ${input.id}`)
      const transactionCount = await database.transactions.countForPortfolioId(input.id)
      if (transactionCount > 0) {
        throw RpcError.badRequest('Portfolios with at least one transaction cannot be deleted')
      }
      await database.portfolios.delete(input.id)
      return { data: undefined }
    },
  })
}
