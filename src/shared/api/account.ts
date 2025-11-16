import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { accountSchema } from '../models/Account'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1AccountDefinition = {
  listAccounts: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(accountSchema)),
  retrieveAccount: createRpcCallDefinition(byIdSchema, responseSchema(accountSchema)),
  createAccount: createRpcCallDefinition(
    accountSchema.omit({ id: true, createdAt: true }),
    responseSchema(accountSchema)
  ),
  updateAccount: createRpcCallDefinition(accountSchema, responseSchema(accountSchema)),
  updateAccountStatus: createRpcCallDefinition(
    accountSchema.pick({ id: true, status: true }),
    responseSchema(accountSchema)
  ),
  deleteAccount: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),
}
