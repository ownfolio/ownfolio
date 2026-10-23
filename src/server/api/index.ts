import { createRpcCall } from '@ownfolio/rpc-core'
import { createRpcExpressServer } from '@ownfolio/rpc-express'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'

import { responseSchema } from '../../shared/utils/schemas'
import { Config } from '../config'
import { Database } from '../database'
import { logger } from '../logger'
import { createMcp } from '../mcp'
import { createRpcV1Account } from './account'
import { createRpcV1Asset } from './asset'
import { createRpcV1Attachment } from './attachment'
import { createAttachmentUpload } from './attachmentUpload'
import { createRpcV1Balance } from './balance'
import { createRpcCtx, RpcCtx } from './context'
import { createRpcV1Dashboard } from './dashboard'
import { createRpcV1Evaluations } from './evaluations'
import { createRpcV1OAuth } from './oauth'
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
    ...createRpcV1Attachment(database, config),
    ...createRpcV1Balance(database),
    ...createRpcV1Report(database),
    ...createRpcV1Dashboard(database),
    ...createRpcV1OAuth(database),
  }
}

export async function createApi(database: Database, config: Config): Promise<express.Router> {
  const router = express.Router()

  const rpcV1 = createRpcV1(database, config)
  // limits password guessing per client IP, successful logins do not count
  router.use(
    ['/api/v1/login', '/api/v1/register'],
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many failed attempts, try again later' },
    })
  )
  router.use(createAttachmentUpload(database))
  router.use(
    '/api/v1',
    createRpcExpressServer<RpcCtx>(rpcV1, {
      createContext: createRpcCtx(database),
      requestBodyLimit: '10mb',
    })
  )

  try {
    router.use(createMcp(database, config, rpcV1))
  } catch (error) {
    logger.error('Unable to set up MCP endpoint, PUBLIC_URL must use https (except for localhost)', { error })
  }

  return router
}
