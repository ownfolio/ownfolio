import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { portfolioSchema } from '../models/Portfolio'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1PortfolioDefinition = {
  listPortfolios: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(portfolioSchema)),
  retrievePortfolio: createRpcCallDefinition(byIdSchema, responseSchema(portfolioSchema)),
  createPortfolio: createRpcCallDefinition(
    portfolioSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(portfolioSchema)
  ),
  updatePortfolio: createRpcCallDefinition(portfolioSchema, responseSchema(portfolioSchema)),
  updatePortfolioStatus: createRpcCallDefinition(
    portfolioSchema.pick({ id: true, status: true }),
    responseSchema(portfolioSchema)
  ),
  deletePortfolio: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),
}
