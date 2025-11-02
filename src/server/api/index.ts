import { createRpcCall } from '@choffmeister/rpc-core'
import { createRpcExpressServer } from '@choffmeister/rpc-express'
import { createRpcOpenApi } from '@choffmeister/rpc-openapi'
import express from 'express'
import { z } from 'zod'

import { Config } from '../config'
import { Database } from '../database'
import { createRpcV1Account } from './account'
import { createRpcV1Asset } from './asset'
import { createRpcV1Attachment } from './attachment'
import { createRpcV1Balance } from './balance'
import { createRpcCtx, RpcCtx } from './context'
import { createRpcV1Evaluations } from './evaluations'
import { createRpcV1Portfolio } from './portfolio'
import { createRpcV1Quote } from './quote'
import { createRpcV1Report } from './report'
import { createRpcV1Transaction } from './transaction'
import { createRpcV1User } from './user'
import { responseSchema } from './utils'

export type { RpcCtx } from './context'

export function createRpcV1(database: Database, config: Config) {
  return {
    ping: createRpcCall(z.void(), responseSchema(z.void()), async (_ctx: RpcCtx) => ({})),
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
  }
}

export type RpcV1 = ReturnType<typeof createRpcV1>

export async function createApi(database: Database, config: Config): Promise<express.Router> {
  const router = express.Router()

  const rpcV1 = createRpcV1(database, config)
  const rpcV1OpenApi = createRpcOpenApi<RpcCtx>(rpcV1, {
    infoTitle: 'ownfolio',
    infoVersion: 'v1',
    serverUrl: 'http://localhost:3000/api/v1',
  })
  router.options('/api/v1/openapi.json', (_req, res) => {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    })
    res.end()
  })
  router.get('/api/v1/openapi.json', (_req, res) => {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json',
    })
    res.write(JSON.stringify(rpcV1OpenApi))
    res.end()
  })
  router.use(
    '/api/v1',
    createRpcExpressServer<RpcCtx>(rpcV1, {
      createContext: createRpcCtx(database),
      requestBodyLimit: '1mb',
    })
  )

  return router
}
