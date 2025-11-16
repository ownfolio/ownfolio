import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1BalanceDefinition } from '../../shared/api/balance'
import { dateEquals, dateFormat, dateList, dateParse, dateStartOf } from '../../shared/utils/date'
import { evaluateBalances } from '../balance'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Balance(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1BalanceDefinition>(rpcV1BalanceDefinition, {
    evaluateBalances: async (ctx, input) => {
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
    },
  })
}
