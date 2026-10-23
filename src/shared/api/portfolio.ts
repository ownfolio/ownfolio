import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { portfolioSchema } from '../models/Portfolio'
import { byIdSchemaFor, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1PortfolioDefinition = {
  listPortfolios: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(portfolioSchema)),
  retrievePortfolio: createRpcCallDefinition(byIdSchemaFor('portfolio'), responseSchema(portfolioSchema)),
  createPortfolio: createRpcCallDefinition(
    portfolioSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(portfolioSchema)
  ),
  updatePortfolio: createRpcCallDefinition(portfolioSchema, responseSchema(portfolioSchema)),
  updatePortfolioStatus: createRpcCallDefinition(
    portfolioSchema.pick({ id: true, status: true }),
    responseSchema(portfolioSchema)
  ),
  deletePortfolio: createRpcCallDefinition(byIdSchemaFor('portfolio'), responseSchema(z.void())),
}
