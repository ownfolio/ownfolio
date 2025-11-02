import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { balanceSchema } from '../../shared/models/Balance'
import { dateEquals, dateFormat, dateList, dateParse, dateStartOf, dateUnitSchema } from '../../shared/utils/date'
import { evaluateBalances } from '../balance'
import { Database } from '../database'
import { RpcCtx } from './context'
import { listResponseSchema } from './utils'

export const balanceRequestSchema = z.object({
  when: z.discriminatedUnion('type', [
    z.object({ type: z.literal('now') }),
    z.object({ type: z.literal('dates'), dates: z.array(z.string().regex(/^(\d{4}-\d{2}-\d{2})$/)).min(1) }),
    z.object({ type: z.literal('historical'), resolution: dateUnitSchema.optional() }),
  ]),
})
export const balanceResponseSchema = listResponseSchema(balanceSchema)

export function createRpcV1Balance(database: Database) {
  return {
    evaluateBalances: createRpcCall(balanceRequestSchema, balanceResponseSchema, async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transactions = await database.transactions.listByUserId(ctx.user.id, {}, 'asc')
      const quotes = await database.quotes.listAllClosesByUserId(ctx.user.id)
      const now = new Date()
      const dates: string[] = (() => {
        switch (input.when.type) {
          case 'now': {
            return [dateFormat(dateStartOf(now, 'day'), 'yyyy-MM-dd')]
          }
          case 'dates': {
            return input.when.dates
          }
          case 'historical': {
            const dates = transactions[0]
              ? dateList(dateParse(transactions[0].date), now, input.when.resolution || 'day')
              : []
            if (dates.length === 0 || !dateEquals(dates[dates.length - 1], now, 'day')) {
              dates.push(dateStartOf(now, 'day'))
            }
            return dates.map(date => dateFormat(date, 'yyyy-MM-dd'))
          }
        }
      })()
      const data = evaluateBalances(dates, transactions, { quotes })
      return { data }
    }),
  }
}
