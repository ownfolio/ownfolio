import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import postgres from 'postgres'
import { z } from 'zod'

import { userSchema } from '../../shared/models/User'
import { fileSchema, parseDataUrl, renderDataUrl } from '../../shared/utils/file'
import { Config } from '../config'
import { exportTransactionsCsv, importTransactionsCsv } from '../csv'
import { Database } from '../database'
import { RpcCtx } from './context'
import { responseSchema } from './utils'

export type { RpcCtx } from './context'

export function createRpcV1User(database: Database, config: Config) {
  return {
    register: createRpcCall(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8).max(128),
        rememberMe: z.boolean().default(false),
      }),
      responseSchema(userSchema),
      async (ctx: RpcCtx, input) => {
        if (!config.userRegistrationEnabled) {
          throw RpcError.conflict('Registration is disabled')
        }
        const user = await database.users.create({ email: input.email }, input.password).catch(err => {
          if (err instanceof postgres.PostgresError && err.constraint_name === 'idx__user__email') {
            throw RpcError.conflict('Email already taken')
          } else {
            throw err
          }
        })
        const sessionId = await database.users.createSession(user.id, input.rememberMe)
        ctx.setSessionId(sessionId, input.rememberMe)
        return { data: user }
      }
    ),
    login: createRpcCall(
      z.object({
        email: z.string().toLowerCase().trim(),
        password: z.string(),
        rememberMe: z.boolean().default(false),
      }),
      responseSchema(userSchema),
      async (ctx: RpcCtx, input) => {
        const user = await withMinimumDuration(
          async () => {
            const user = await database.users.findByEmail(input.email)
            const valid = await database.users.verifyPassword(user?.id || '', input.password)
            return valid ? user : undefined
          },
          {
            millis: 1000,
            ignore: value => !!value,
          }
        )
        if (!user) {
          throw RpcError.unauthorized('Invalid email or password')
        }
        const sessionId = await database.users.createSession(user.id, input.rememberMe)
        await ctx.unsetSessionId()
        await ctx.setSessionId(sessionId, input.rememberMe)
        return { data: user }
      }
    ),
    logout: createRpcCall(z.void(), responseSchema(z.void()), async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      await ctx.unsetSessionId()
      return {}
    }),
    me: createRpcCall(z.void(), responseSchema(userSchema), async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      if (ctx.sessionId) {
        const rememberMe = await database.users.renewSession(ctx.sessionId)
        if (rememberMe !== undefined) {
          ctx.setSessionId(ctx.sessionId, rememberMe)
        }
      }
      return { data: ctx.user }
    }),
    changeEmail: createRpcCall(
      z.object({ newEmail: z.string().trim().toLowerCase().email() }),
      responseSchema(userSchema),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const user = await database.users.retrieve(ctx.user.id)
        const user2 = await database.users.update({ ...user, email: input.newEmail })
        return { data: user2 }
      }
    ),
    changePassword: createRpcCall(
      z.object({ oldPassword: z.string(), newPassword: z.string().min(8).max(128) }),
      responseSchema(z.void()),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        if (!(await database.users.verifyPassword(ctx.user.id, input.oldPassword))) {
          throw RpcError.badRequest('Old password is incorrect')
        }
        await database.users.setPassword(ctx.user.id, input.newPassword)
        return {}
      }
    ),
    exportUserTransactionsAsCsv: createRpcCall(z.void(), responseSchema(fileSchema), async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const csv = await exportTransactionsCsv(database, ctx.user.id)
      const file = {
        fileName: 'myfolio-transactions.csv',
        dataUrl: renderDataUrl('text/csv', Buffer.from(csv).toString('base64')),
      }
      return { data: file }
    }),
    importUserTransactionsFromCsv: createRpcCall(fileSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const [mimeType, bytesBase64] = parseDataUrl(input.dataUrl)
      if (mimeType !== 'text/csv') {
        throw RpcError.badRequest('Only CSV files are accepted')
      }
      await importTransactionsCsv(database, ctx.user.id, Buffer.from(bytesBase64, 'base64').toString('utf-8'))
      return {}
    }),
  }
}

interface WithMinimumDurationOpts<T> {
  millis: number
  ignore: (value: T) => boolean
}

async function withMinimumDuration<T>(promiseFn: () => Promise<T>, opts: WithMinimumDurationOpts<T>): Promise<T> {
  const timer = new Promise(resolve => setTimeout(resolve, opts.millis))
  const result = await promiseFn()
  if (!opts.ignore || !opts.ignore(result)) {
    await timer
  }
  return result
}
