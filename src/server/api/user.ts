import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import postgres from 'postgres'
import { z } from 'zod'

import { userSchema } from '../../shared/models/User'
import { dateEndOf, dateList, dateParse } from '../../shared/utils/date'
import { fileSchema, parseDataUrl, renderDataUrl } from '../../shared/utils/file'
import { Config } from '../config'
import { exportTransactionsCsv, importTransactionsCsv } from '../csv'
import { Database } from '../database'
import { evaluationSumOverAccounts, evaluationSumOverAccountsAndAssets } from '../evaluations/evaluate'
import { evaluateHistoricalAllWithQuotes } from '../evaluations/evaluateAll'
import { generatePdf } from '../pdf/generatePdf'
import { RpcCtx } from './context'

export type { RpcCtx } from './context'

export function createRpcV1User(database: Database, config: Config) {
  return {
    register: createRpcCall(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8).max(128),
        rememberMe: z.boolean().default(false),
      }),
      userSchema,
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
        return user
      }
    ),
    login: createRpcCall(
      z.object({
        email: z.string().toLowerCase().trim(),
        password: z.string(),
        rememberMe: z.boolean().default(false),
      }),
      userSchema,
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
        return user
      }
    ),
    logout: createRpcCall(z.void(), z.void(), async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      await ctx.unsetSessionId()
    }),
    me: createRpcCall(z.void(), userSchema, async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      if (ctx.sessionId) {
        const rememberMe = await database.users.renewSession(ctx.sessionId)
        if (rememberMe !== undefined) {
          ctx.setSessionId(ctx.sessionId, rememberMe)
        }
      }
      return ctx.user
    }),
    changeEmail: createRpcCall(
      z.object({ newEmail: z.string().trim().toLowerCase().email() }),
      userSchema,
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const user = await database.users.retrieve(ctx.user.id)
        return await database.users.update({ ...user, email: input.newEmail })
      }
    ),
    changePassword: createRpcCall(
      z.object({ oldPassword: z.string(), newPassword: z.string().min(8).max(128) }),
      z.void(),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        if (!(await database.users.verifyPassword(ctx.user.id, input.oldPassword))) {
          throw RpcError.badRequest('Old password is incorrect')
        }
        await database.users.setPassword(ctx.user.id, input.newPassword)
      }
    ),
    exportUserTransactionsAsCsv: createRpcCall(z.void(), fileSchema, async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const csv = await exportTransactionsCsv(database, ctx.user.id)
      return {
        fileName: 'myfolio-transactions.csv',
        dataUrl: renderDataUrl('text/csv', Buffer.from(csv).toString('base64')),
      }
    }),
    importUserTransactionsFromCsv: createRpcCall(fileSchema, z.void(), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const [mimeType, bytesBase64] = parseDataUrl(input.dataUrl)
      if (mimeType !== 'text/csv') {
        throw RpcError.badRequest('Only CSV files are accepted')
      }
      await importTransactionsCsv(database, ctx.user.id, Buffer.from(bytesBase64, 'base64').toString('utf-8'))
    }),
    generateYearlyPdfReport: createRpcCall(z.void(), fileSchema, async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transactions = await database.transactions.listByUserId(ctx.user.id).then(txs => txs.reverse())
      const allQuotes = await database.quotes.listAllClosesByUserId(ctx.user.id)
      const now = new Date()
      const dates = dateList(transactions[0] ? dateParse(transactions[0].date) : now, now, 'year').map(d =>
        dateEndOf(d, 'year')
      )
      const allResult = evaluateHistoricalAllWithQuotes(transactions, allQuotes, dates)
      const pdf = await generatePdf({
        content: [
          { text: 'Yearly report', style: 'h1' },
          ...allResult.flatMap(result => {
            return [
              { text: dateParse(result.date).getFullYear(), style: 'h2' },
              {
                style: 'table',
                table: {
                  widths: ['*', '*', '*'],
                  body: [
                    [{ text: 'Cash' }, { text: 'Assets' }, { text: 'Total' }],
                    [
                      { text: evaluationSumOverAccounts(result.value.accountCashHoldings).toString() },
                      { text: evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices).toString() },
                      {
                        text: evaluationSumOverAccounts(result.value.accountCashHoldings)
                          .plus(evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices))
                          .toString(),
                        style: 'totalAmount',
                      },
                    ],
                  ],
                },
              },
            ]
          }),
        ],
        styles: {
          h1: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10],
          },
          h2: {
            fontSize: 16,
            bold: true,
            margin: [0, 10, 0, 5],
          },
          table: {
            margin: [0, 5, 0, 15],
          },
          amount: {},
          totalAmount: {
            bold: true,
          },
        },
      })
      return {
        fileName: 'myfolio-yearly-report.pdf',
        dataUrl: renderDataUrl('application/pdf', pdf.toString('base64')),
      }
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
