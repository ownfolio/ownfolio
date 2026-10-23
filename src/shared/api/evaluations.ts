import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { dateUnitSchema } from '../utils/date'
import { dateStringSchema, listResponseSchema, responseSchema } from '../utils/schemas'

export const evaluateSummaryRequestSchema = z.object({
  when: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('now').describe('A single evaluation for today') }),
      z.object({
        type: z.literal('dates').describe('One evaluation per given date'),
        dates: z.array(dateStringSchema).min(1).describe('Dates (YYYY-MM-DD) to evaluate at, in ascending order'),
      }),
      z.object({
        type: z
          .literal('historical')
          .describe('A time series from the date of the first transaction until today, always including today'),
        resolution: dateUnitSchema.optional().describe('Distance between two evaluated dates, defaults to day'),
      }),
    ])
    .describe('Dates to evaluate at. Each evaluation includes all transactions up to the end of its date'),
  buckets: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('all').describe('All accounts, keyed as "all" in the result') }),
        z.object({
          type: z.literal('portfolio').describe('All accounts of a portfolio, keyed by the portfolio ID'),
          portfolioId: z.string().describe('ID of the portfolio'),
        }),
        z.object({
          type: z.literal('account').describe('A single account, keyed by the account ID'),
          accountId: z.string().describe('ID of the account'),
        }),
      ])
    )
    .describe('Groups of accounts to evaluate separately'),
  values: z
    .array(
      z
        .enum(['total', 'deposit', 'cash', 'assetsOpenPrice', 'assetsCurrentPrice', 'realizedProfits'])
        .describe(
          [
            'total: cash plus assetsCurrentPrice',
            'deposit: cash plus assetsOpenPrice minus realizedProfits, i.e. money paid in including received interest and dividends and minus paid fees and taxes (total minus deposit is the price gain, realized and unrealized)',
            'cash: cash balance',
            'assetsOpenPrice: cost basis of all held asset units',
            'assetsCurrentPrice: market value of all held asset units based on the latest close quote, falling back to the cost basis for assets without quotes',
            'realizedProfits: sum of sale proceeds minus cost basis of all sold units, before fees and taxes',
          ].join('; ')
        )
    )
    .min(1)
    .describe('Values to compute, in the order they appear in each result row'),
})
export const evaluateSummaryResponseSchema = responseSchema(
  z.object({
    value: z.record(z.string(), z.array(z.array(z.string()))),
    errors: z.array(z.never()),
  })
)

export const evaluatePositionsRequestSchema = z.object({
  when: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('now').describe('Positions as of today') }),
      z.object({
        type: z.literal('date').describe('Positions at the end of the given date'),
        date: dateStringSchema.describe('Date (YYYY-MM-DD) to evaluate at'),
      }),
    ])
    .describe('Date to evaluate at'),
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

export const rpcV1EvaluationsDefinition = {
  evaluateSummary: createRpcCallDefinition(evaluateSummaryRequestSchema, evaluateSummaryResponseSchema),
  evaluatePositions: createRpcCallDefinition(evaluatePositionsRequestSchema, evaluatePositionsResponseSchema),
  evaluatePlausibility: createRpcCallDefinition(evaluatePlausibilityRequestSchema, evaluatePlausibilityResponseSchema),
}
