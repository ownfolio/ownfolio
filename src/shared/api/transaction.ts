import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { transactionSchema, transactionSearchResultSchema, transactionSearchSchema } from '../models/Transaction'
import { byIdSchemaFor, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1TransactionDefinition = {
  listTransactions: createRpcCallDefinition(
    transactionSearchSchema.extend(pagingParamsSchema.shape),
    listResponseSchema(transactionSearchResultSchema)
  ),
  retrieveTransaction: createRpcCallDefinition(byIdSchemaFor('transaction'), responseSchema(transactionSchema)),
  createTransaction: createRpcCallDefinition(
    transactionSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(transactionSchema)
  ),
  updateTransaction: createRpcCallDefinition(transactionSchema, responseSchema(transactionSchema)),
  deleteTransaction: createRpcCallDefinition(byIdSchemaFor('transaction'), responseSchema(z.void())),
}
