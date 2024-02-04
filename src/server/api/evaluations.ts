import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { groupBy, maxBy, minBy, selectionSortBy } from '../../shared/utils/array'
import { dateEquals, dateList, dateParse, dateStartOf, dateUnitSchema } from '../../shared/utils/date'
import { Database } from '../database'
import { evaluationSumOverAccounts, evaluationSumOverAccountsAndAssets } from '../evaluations/evaluate'
import { evaluateAll, evaluateHistoricalAllWithQuotes } from '../evaluations/evaluateAll'
import { RpcCtx } from './context'
import { responseSchema } from './utils'

export function createRpcV1Evaluations(database: Database) {
  return {
    evaluateSummary: createRpcCall(
      z.object({
        when: z.discriminatedUnion('type', [
          z.object({ type: z.literal('now') }),
          z.object({ type: z.literal('dates'), dates: z.array(z.string().regex(/^(\d{4}-\d{2}-\d{2})$/)).min(1) }),
          z.object({ type: z.literal('historical'), resolution: dateUnitSchema.optional() }),
        ]),
        buckets: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('all') }),
            z.object({ type: z.literal('portfolio'), portfolioId: z.string() }),
            z.object({ type: z.literal('account'), accountId: z.string() }),
          ])
        ),
        values: z
          .array(
            z.enum([
              'total',
              'deposit',
              'cash',
              'cashInterest',
              'cashDividend',
              'cashFee',
              'cashTax',
              'assetsOpenPrice',
              'assetsCurrentPrice',
              'realizedProfits',
            ])
          )
          .min(1),
      }),
      responseSchema(
        z.object({
          value: z.record(z.string(), z.array(z.array(z.string()))),
          errors: z.array(z.never()),
        })
      ),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const accounts = await database.accounts.listByUserId(ctx.user.id)
        const transactions = await database.transactions.listByUserId(ctx.user.id, {}, 'asc')
        const allQuotes = (['total', 'assetsCurrentPrice'] as const).find(value => input.values.includes(value))
          ? await database.quotes.listAllClosesByUserId(ctx.user.id)
          : []
        const now = new Date()
        const dates = (() => {
          switch (input.when.type) {
            case 'now': {
              return [dateStartOf(now, 'day')]
            }
            case 'dates': {
              return selectionSortBy(input.when.dates.map(dateParse), (a, b) => a.valueOf() - b.valueOf())
            }
            case 'historical': {
              const dates = transactions[0]
                ? dateList(dateParse(transactions[0].date), now, input.when.resolution || 'day')
                : []
              if (dates.length === 0 || !dateEquals(dates[dates.length - 1], now, 'day')) {
                dates.push(dateStartOf(now, 'day'))
              }
              return dates
            }
          }
        })()
        const result = evaluateHistoricalAllWithQuotes(transactions, allQuotes, dates)
        const data = {
          value: input.buckets.reduce((acc, bucket) => {
            const [key, accountFilter] = (() => {
              switch (bucket.type) {
                case 'all':
                  return ['all', undefined] as const
                case 'portfolio':
                  return [
                    bucket.portfolioId,
                    (aid: string) => accounts.find(a => a.id === aid)?.portfolioId === bucket.portfolioId,
                  ] as const
                case 'account':
                  return [bucket.accountId, (aid: string) => aid === bucket.accountId] as const
              }
            })()
            return {
              ...acc,
              [key]: result.map(r => {
                return [
                  r.date,
                  ...input.values.map(value => {
                    switch (value) {
                      case 'total':
                        return evaluationSumOverAccounts(r.value.accountCashHoldings, accountFilter).plus(
                          evaluationSumOverAccountsAndAssets(r.value.accountAssetCurrentPrices, accountFilter)
                        )
                      case 'deposit':
                        return evaluationSumOverAccounts(r.value.accountCashHoldings, accountFilter)
                          .plus(evaluationSumOverAccountsAndAssets(r.value.accountAssetOpenPrices, accountFilter))
                          .minus(evaluationSumOverAccountsAndAssets(r.value.accountAssetRealizedProfits, accountFilter))
                          .minus(evaluationSumOverAccounts(r.value.accountCashInterest, accountFilter))
                          .minus(evaluationSumOverAccounts(r.value.accountCashDividend, accountFilter))
                          .plus(evaluationSumOverAccounts(r.value.accountCashFee, accountFilter))
                          .plus(evaluationSumOverAccounts(r.value.accountCashTax, accountFilter))
                      case 'cash':
                        return evaluationSumOverAccounts(r.value.accountCashHoldings, accountFilter).toString()
                      case 'cashInterest':
                        return evaluationSumOverAccounts(r.value.accountCashInterest, accountFilter).toString()
                      case 'cashDividend':
                        return evaluationSumOverAccounts(r.value.accountCashDividend, accountFilter).toString()
                      case 'cashFee':
                        return evaluationSumOverAccounts(r.value.accountCashFee, accountFilter).toString()
                      case 'cashTax':
                        return evaluationSumOverAccounts(r.value.accountCashTax, accountFilter).toString()
                      case 'assetsOpenPrice':
                        return evaluationSumOverAccountsAndAssets(
                          r.value.accountAssetOpenPrices,
                          accountFilter
                        ).toString()
                      case 'assetsCurrentPrice':
                        return evaluationSumOverAccountsAndAssets(
                          r.value.accountAssetCurrentPrices,
                          accountFilter
                        ).toString()
                      case 'realizedProfits':
                        return evaluationSumOverAccountsAndAssets(
                          r.value.accountAssetRealizedProfits,
                          accountFilter
                        ).toString()
                    }
                  }),
                ]
              }),
            }
          }, {}),
          errors: [],
        }
        return { data }
      }
    ),
    evaluatePositions: createRpcCall(
      z.object({
        when: z.discriminatedUnion('type', [
          z.object({ type: z.literal('now') }),
          z.object({ type: z.literal('date'), date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/) }),
        ]),
      }),
      responseSchema(
        z.object({
          value: z.object({
            openAssetPositions: z.array(
              z.object({
                type: z.literal('open'),
                accountId: z.string(),
                assetId: z.string(),
                amount: z.string(),
                openDate: z.string(),
                openTime: z.string(),
                openPrice: z.string(),
                currentPrice: z.string(),
                positions: z.array(
                  z.object({
                    amount: z.string(),
                    openTransactionId: z.string(),
                    openDate: z.string(),
                    openTime: z.string(),
                    openPrice: z.string(),
                    currentPrice: z.string(),
                  })
                ),
              })
            ),
            closedAssetPositions: z.array(
              z.object({
                type: z.literal('closed'),
                accountId: z.string(),
                assetId: z.string(),
                amount: z.string(),
                openDate: z.string(),
                openTime: z.string(),
                openPrice: z.string(),
                closeDate: z.string(),
                closeTime: z.string(),
                closePrice: z.string(),
                positions: z.array(
                  z.object({
                    amount: z.string(),
                    openTransactionId: z.string(),
                    openDate: z.string(),
                    openTime: z.string(),
                    openPrice: z.string(),
                    closeTransactionId: z.string(),
                    closeDate: z.string(),
                    closeTime: z.string(),
                    closePrice: z.string(),
                  })
                ),
              })
            ),
          }),
          errors: z.array(z.never()),
        })
      ),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const transactions = await database.transactions.listByUserId(
          ctx.user.id,
          { toDate: input.when.type === 'date' ? input.when.date : undefined },
          'asc'
        )
        const quotes = await database.quotes.listLatestClosesByUserId(
          ctx.user.id,
          input.when.type === 'date' ? input.when.date : undefined
        )
        const result = evaluateAll(transactions)
        const openAssetPositions = groupBy(result.value.openAssetPositions, p => `${p.accountId}-${p.assetId}`).map(
          ps => {
            const accountId = ps[0].accountId
            const assetId = ps[0].assetId
            const amount = BigNumber.sum(...ps.map(p => p.amount))
            const openDate = minBy(ps, p => dateParse(p.openDate + 'T' + p.openTime).valueOf())!.openDate
            const openTime = minBy(ps, p => dateParse(p.openDate + 'T' + p.openTime).valueOf())!.openTime
            const openPrice = BigNumber.sum(...ps.map(p => p.openPrice))
            const currentQuote = quotes.find(q => q.assetId === assetId)
            return {
              type: 'open' as const,
              accountId,
              assetId,
              amount: amount.toString(),
              openDate: openDate,
              openTime: openTime,
              openPrice: openPrice.toString(),
              currentPrice: currentQuote
                ? BigNumber(currentQuote.close).multipliedBy(amount).toString()
                : openPrice.toString(),
              positions: ps.map(p => {
                return {
                  amount: p.amount.toString(),
                  openTransactionId: p.openTransactionId,
                  openDate: p.openDate,
                  openTime: p.openTime,
                  openPrice: p.openPrice.toString(),
                  currentPrice: currentQuote
                    ? BigNumber(currentQuote.close).multipliedBy(p.amount).toString()
                    : p.openPrice.toString(),
                }
              }),
            }
          }
        )
        const closedAssetPositions = groupBy(result.value.closedAssetPositions, p => `${p.accountId}-${p.assetId}`).map(
          ps => {
            const accountId = ps[0].accountId
            const assetId = ps[0].assetId
            const amount = BigNumber.sum(...ps.map(p => p.amount))
            const openDate = minBy(ps, p => dateParse(p.openDate + 'T' + p.openTime).valueOf())!.openDate
            const openTime = minBy(ps, p => dateParse(p.openDate + 'T' + p.openTime).valueOf())!.openTime
            const openPrice = BigNumber.sum(...ps.map(p => p.openPrice))
            const closeDate = maxBy(ps, p => dateParse(p.closeDate + 'T' + p.closeTime).valueOf())!.closeDate
            const closeTime = maxBy(ps, p => dateParse(p.closeDate + 'T' + p.closeTime).valueOf())!.closeTime
            const closePrice = BigNumber.sum(...ps.map(p => p.closePrice))
            return {
              type: 'closed' as const,
              accountId,
              assetId,
              amount: amount.toString(),
              openDate,
              openTime,
              openPrice: openPrice.toString(),
              closeDate,
              closeTime,
              closePrice: closePrice.toString(),
              positions: ps.map(p => {
                return {
                  amount: p.amount.toString(),
                  openTransactionId: p.openTransactionId,
                  openDate: p.openDate,
                  openTime: p.openTime,
                  openPrice: p.openPrice.toString(),
                  closeTransactionId: p.closeTransactionId,
                  closeDate: p.closeDate,
                  closeTime: p.closeTime,
                  closePrice: p.closePrice.toString(),
                }
              }),
            }
          }
        )
        const data = {
          value: {
            openAssetPositions,
            closedAssetPositions,
          },
          errors: [],
        }
        return { data }
      }
    ),
  }
}
