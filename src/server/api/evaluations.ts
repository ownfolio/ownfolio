import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { groupBy, maxBy, minBy, selectionSortBy } from '../../shared/utils/array'
import { dateEquals, dateFormat, dateList, dateParse, dateStartOf, dateUnitSchema } from '../../shared/utils/date'
import { evaluateBalance } from '../balance'
import { Database } from '../database'
import { PdfParserResult } from '../pdf/parse'
import { RpcCtx } from './context'
import { listResponseSchema, responseSchema } from './utils'

export const evaluateSummaryRequestSchema = z.object({
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
    .array(z.enum(['total', 'deposit', 'cash', 'assetsOpenPrice', 'assetsCurrentPrice', 'realizedProfits']))
    .min(1),
})
export const evaluateSummaryResponseSchema = responseSchema(
  z.object({
    value: z.record(z.string(), z.array(z.array(z.string()))),
    errors: z.array(z.never()),
  })
)

export const evaluatePositionsRequestSchema = z.object({
  when: z.discriminatedUnion('type', [
    z.object({ type: z.literal('now') }),
    z.object({ type: z.literal('date'), date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/) }),
  ]),
})
export const evaluatePositionsResponseSchema = responseSchema(
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
)

export const plausibilityFindingLevel = z.enum(['info', 'warning', 'error'])
export const evaluatePlausibilityRequestSchema = z.void()
export const evaluatePlausibilityResponseSchema = listResponseSchema(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('transactionHasNoAttachment'),
      date: z.string(),
      level: plausibilityFindingLevel,
      transactionId: z.string(),
    }),
    z.object({
      type: z.literal('transactionDataConflictsWithAttachmentContent'),
      date: z.string(),
      level: plausibilityFindingLevel,
      transactionId: z.string(),
      attachmentId: z.string(),
      conflicts: z
        .array(
          z.object({
            key: z.enum(['date', 'time', 'assetAmount', 'cashAmount', 'feeCashAmount', 'taxCashAmount', 'reference']),
            actual: z.string(),
            expected: z.string(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal('transactionConsumesMoreAssetAmountThanAvailable'),
      date: z.string(),
      level: plausibilityFindingLevel,
      transactionId: z.string(),
      assetAccountId: z.string(),
      assetId: z.string(),
      excessiveAssetAmount: z.string(),
    }),
  ])
)

type ArrayElements<A> = A extends (infer B)[] ? B : never

export function createRpcV1Evaluations(database: Database) {
  return {
    evaluateSummary: createRpcCall(
      evaluateSummaryRequestSchema,
      evaluateSummaryResponseSchema,
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const accounts = await database.accounts.listByUserId(ctx.user.id)
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
        const result = evaluateBalance(dates, transactions, { quotes })
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
                      case 'total': {
                        const cash = r.cashPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
                        const assets = r.assetPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => {
                            const quote = r.quotes[p.assetId]
                            return sum.plus(quote ? BigNumber(quote).multipliedBy(p.amount) : p.openPrice)
                          }, BigNumber(0))
                        return cash.plus(assets).toString()
                      }
                      case 'deposit': {
                        const cash = r.cashPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
                        const assetOpenPrices = r.assetPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.openPrice), BigNumber(0))
                        const realizedProfits = r.assetPositions.closed
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.closePrice).minus(p.openPrice), BigNumber(0))
                          .toString()
                        return cash.plus(assetOpenPrices).minus(realizedProfits).toString()
                      }
                      case 'cash': {
                        return r.cashPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
                          .toString()
                      }
                      case 'assetsOpenPrice': {
                        return r.assetPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.openPrice), BigNumber(0))
                          .toString()
                      }
                      case 'assetsCurrentPrice': {
                        return r.assetPositions.open
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => {
                            const quote = r.quotes[p.assetId]
                            return sum.plus(quote ? BigNumber(quote).multipliedBy(p.amount) : p.openPrice)
                          }, BigNumber(0))
                          .toString()
                      }
                      case 'realizedProfits': {
                        return r.assetPositions.closed
                          .filter(p => !accountFilter || accountFilter(p.accountId))
                          .reduce((sum, p) => sum.plus(p.closePrice).minus(p.openPrice), BigNumber(0))
                          .toString()
                      }
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
      evaluatePositionsRequestSchema,
      evaluatePositionsResponseSchema,
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
        const date =
          input.when.type === 'date' ? input.when.date : dateFormat(dateStartOf(new Date(), 'day'), 'yyyy-MM-dd')
        const result = evaluateBalance([date], transactions, { quotes })[0]
        const openAssetPositions = groupBy(result.assetPositions.open, p => `${p.accountId}-${p.assetId}`).map(ps => {
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
        })
        const closedAssetPositions = groupBy(result.assetPositions.closed, p => `${p.accountId}-${p.assetId}`).map(
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
    evaluatePlausibility: createRpcCall(
      evaluatePlausibilityRequestSchema,
      evaluatePlausibilityResponseSchema,
      async (ctx: RpcCtx) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const data: z.infer<typeof evaluatePlausibilityResponseSchema>['data'] = []
        const transactions = await database.transactions.listByUserId(ctx.user.id, {}, 'asc')
        const attachments = await database.attachments.listByUserId(ctx.user.id)
        const attachmentPdfParses = await database.attachments
          .listDerivations(
            attachments.map(a => a.id),
            'pdfParse'
          )
          .then(result =>
            result.map(([attachmentId, buf]) => {
              return {
                attachmentId,
                parsed: JSON.parse(buf.toString('utf-8')) as PdfParserResult | null,
              }
            })
          )
        transactions.forEach(transaction => {
          const {
            id,
            data: { type },
            attachmentIds,
          } = transaction
          if (attachmentIds.length === 0 && ['assetBuy', 'assetSell'].includes(type)) {
            data.push({
              type: 'transactionHasNoAttachment',
              date: transaction.date,
              level: 'info',
              transactionId: id,
            })
          }
        })
        transactions.forEach(transaction => {
          const linkedAttachmentPdfParses = attachmentPdfParses.filter(({ attachmentId }) =>
            transaction.attachmentIds.includes(attachmentId)
          )
          linkedAttachmentPdfParses.forEach(({ attachmentId, parsed }) => {
            if (!parsed) {
              return
            }
            if (parsed.type !== 'assetBuy' && parsed.type !== 'assetSell') {
              return
            }
            const { date: txDate, time: txTime, data: txData, reference: txReference } = transaction
            if (txData.type !== 'assetBuy' && txData.type !== 'assetSell') {
              return
            }

            const conflicts: Extract<
              ArrayElements<z.infer<typeof evaluatePlausibilityResponseSchema>['data']>,
              { type: 'transactionDataConflictsWithAttachmentContent' }
            >['conflicts'] = []
            if (parsed.date && txDate !== parsed.date) {
              conflicts.push({
                key: 'date',
                expected: parsed.date,
                actual: txDate,
              })
            }
            if (parsed.time && txTime !== parsed.time) {
              conflicts.push({
                key: 'time',
                expected: parsed.time,
                actual: txTime,
              })
            }
            if (parsed.assetAmount && txData.assetAmount !== parsed.assetAmount.toString()) {
              conflicts.push({
                key: 'assetAmount',
                expected: parsed.assetAmount.toString(),
                actual: txData.assetAmount,
              })
            }
            if (parsed.assetPrice && txData.cashAmount !== parsed.assetPrice.toString()) {
              conflicts.push({
                key: 'cashAmount',
                expected: parsed.assetPrice.toString(),
                actual: txData.cashAmount,
              })
            }
            if (parsed.fee && txData.feeCashAmount !== parsed.fee.toString()) {
              conflicts.push({
                key: 'feeCashAmount',
                expected: parsed.fee.toString(),
                actual: txData.feeCashAmount,
              })
            }
            if (
              parsed.type === 'assetSell' &&
              parsed.tax &&
              txData.type === 'assetSell' &&
              txData.taxCashAmount !== parsed.tax.toString()
            ) {
              conflicts.push({
                key: 'taxCashAmount',
                expected: parsed.tax.toString(),
                actual: txData.taxCashAmount,
              })
            }
            if (parsed.reference && txReference !== parsed.reference) {
              conflicts.push({
                key: 'reference',
                expected: parsed.reference,
                actual: txReference,
              })
            }

            if (conflicts.length > 0) {
              data.push({
                type: 'transactionDataConflictsWithAttachmentContent',
                date: transaction.date,
                level: 'warning',
                transactionId: transaction.id,
                attachmentId: attachmentId,
                conflicts: conflicts,
              })
            }
          })
        })
        return {
          data: selectionSortBy(data, (f1, f2) => (f1.date === f2.date ? 0 : f1.date < f2.date ? -1 : 1)),
        }
      }
    ),
  }
}
