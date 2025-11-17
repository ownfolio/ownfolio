import { createRpcCall } from '@ownfolio/rpc-core'
import { createRpcExpressServer } from '@ownfolio/rpc-express'
import express from 'express'
import { z } from 'zod'

import { responseSchema } from '../../shared/utils/schemas'
import { Config } from '../config'
import { Database } from '../database'
import { createRpcV1Account } from './account'
import { createRpcV1Asset } from './asset'
import { createRpcV1Attachment } from './attachment'
import { createRpcV1Balance } from './balance'
import { createRpcCtx, RpcCtx } from './context'
import { createRpcV1Dashboard } from './dashboard'
import { createRpcV1Evaluations } from './evaluations'
import { createRpcV1Portfolio } from './portfolio'
import { createRpcV1Quote } from './quote'
import { createRpcV1Report } from './report'
import { createRpcV1Transaction } from './transaction'
import { createRpcV1User } from './user'

export type { RpcCtx } from './context'

export function createRpcV1(database: Database, config: Config) {
  return {
    ping: createRpcCall(z.void(), responseSchema(z.void()), async (_ctx: RpcCtx) => ({ data: undefined })),
    version: createRpcCall(z.void(), responseSchema(z.object({ version: z.string() })), async (_ctx: RpcCtx) => ({
      data: { version: 'dev' },
    })),
    ...createRpcV1Account(database),
    ...createRpcV1Asset(database),
    ...createRpcV1Evaluations(database),
    ...createRpcV1Portfolio(database),
    ...createRpcV1Quote(database),
    ...createRpcV1Transaction(database),
    ...createRpcV1User(database, config),
    ...createRpcV1Attachment(database),
    ...createRpcV1Balance(database),
    ...createRpcV1Report(database),
    ...createRpcV1Dashboard(database),
  }
}

export async function createApi(database: Database, config: Config): Promise<express.Router> {
  const router = express.Router()

  const rpcV1 = createRpcV1(database, config)
  router.use(
    '/api/v1',
    createRpcExpressServer<RpcCtx>(rpcV1, {
      createContext: createRpcCtx(database),
      requestBodyLimit: '10mb',
    })
  )

  return router
}
