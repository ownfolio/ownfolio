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
    value: z
      .record(z.string(), z.array(z.array(z.string())))
      .describe(
        'Rows per bucket key ("all", portfolio ID or account ID). Each row is [date, ...values] with the values as decimal strings in the requested order'
      ),
    errors: z.array(z.never()).describe('Always empty'),
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
const positionOpenShape = {
  amount: z.string().describe('Number of units as decimal string'),
  openTransactionId: z.string().describe('ID of the transaction that opened the lot'),
  openDate: dateStringSchema.describe('Date the lot was opened (YYYY-MM-DD)'),
  openTime: z.string().describe('Time the lot was opened'),
  openPrice: z.string().describe('Cost basis of all units of the lot as decimal string, excluding fees'),
}
const positionCloseShape = {
  closeTransactionId: z.string().describe('ID of the transaction that closed the lot'),
  closeDate: dateStringSchema.describe('Date the lot was closed (YYYY-MM-DD)'),
  closeTime: z.string().describe('Time the lot was closed'),
  closePrice: z.string().describe('Proceeds for all units of the lot as decimal string, before fees and taxes'),
}
const positionGroupShape = {
  accountId: z.string().describe('ID of the account'),
  assetId: z.string().describe('ID of the asset'),
  amount: z.string().describe('Total number of units as decimal string'),
  openDate: dateStringSchema.describe('Date the oldest lot was opened (YYYY-MM-DD)'),
  openTime: z.string().describe('Time the oldest lot was opened'),
  openPrice: z.string().describe('Total cost basis as decimal string, excluding fees'),
}

export const evaluatePositionsResponseSchema = responseSchema(
  z.object({
    value: z.object({
      openAssetPositions: z
        .array(
          z.object({
            type: z.literal('open'),
            ...positionGroupShape,
            currentPrice: z
              .string()
              .describe(
                'Market value of all units based on the latest quote up to the date as decimal string, the cost basis if there is no quote'
              ),
            positions: z
              .array(
                z.object({
                  ...positionOpenShape,
                  currentPrice: z.string().describe('Market value of the units of the lot as decimal string'),
                })
              )
              .describe('Individual lots in FIFO order'),
          })
        )
        .describe('Currently held units, one entry per account and asset'),
      closedAssetPositions: z
        .array(
          z.object({
            type: z.literal('closed'),
            ...positionGroupShape,
            closeDate: dateStringSchema.describe('Date the most recent lot was closed (YYYY-MM-DD)'),
            closeTime: z.string().describe('Time the most recent lot was closed'),
            closePrice: z.string().describe('Total proceeds as decimal string, before fees and taxes'),
            positions: z
              .array(z.object({ ...positionOpenShape, ...positionCloseShape }))
              .describe('Individual lots in FIFO order'),
          })
        )
        .describe(
          'Sold or withdrawn units, one entry per account and asset. closePrice minus openPrice is the realized profit'
        ),
    }),
    errors: z.array(z.never()).describe('Always empty'),
  })
)

export const plausibilityFindingLevel = z
  .enum(['info', 'warning', 'error'])
  .describe('info: worth a look; warning: probably wrong; error: derived holdings are wrong')
export const evaluatePlausibilityRequestSchema = z.void()
export const evaluatePlausibilityResponseSchema = listResponseSchema(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('transactionHasNoAttachment').describe('A buy or sell has no linked attachment as evidence'),
      date: dateStringSchema.describe('Date of the transaction (YYYY-MM-DD)'),
      level: plausibilityFindingLevel,
      transactionId: z.string().describe('ID of the transaction'),
    }),
    z.object({
      type: z
        .literal('transactionDataConflictsWithAttachmentContent')
        .describe('Fields of a buy or sell differ from the data parsed from a linked broker statement'),
      date: dateStringSchema.describe('Date of the transaction (YYYY-MM-DD)'),
      level: plausibilityFindingLevel,
      transactionId: z.string().describe('ID of the transaction'),
      attachmentId: z.string().describe('ID of the conflicting attachment'),
      conflicts: z
        .array(
          z.object({
            key: z
              .enum(['date', 'time', 'assetAmount', 'cashAmount', 'feeCashAmount', 'taxCashAmount', 'reference'])
              .describe('Conflicting transaction field (amounts are fields of data)'),
            actual: z.string().describe('Value in the transaction'),
            expected: z.string().describe('Value parsed from the attachment'),
          })
        )
        .min(1),
    }),
    z.object({
      type: z
        .literal('transactionConsumesMoreAssetAmountThanAvailable')
        .describe('A transaction removes more units of an asset from an account than it holds at that point'),
      date: dateStringSchema.describe('Date of the transaction (YYYY-MM-DD)'),
      level: plausibilityFindingLevel,
      transactionId: z.string().describe('ID of the transaction'),
      assetAccountId: z.string().describe('ID of the account the units are removed from'),
      assetId: z.string().describe('ID of the asset'),
      excessiveAssetAmount: z.string().describe('Missing units as decimal string'),
    }),
  ])
)

export const rpcV1EvaluationsDefinition = {
  evaluateSummary: createRpcCallDefinition(evaluateSummaryRequestSchema, evaluateSummaryResponseSchema),
  evaluatePositions: createRpcCallDefinition(evaluatePositionsRequestSchema, evaluatePositionsResponseSchema),
  evaluatePlausibility: createRpcCallDefinition(evaluatePlausibilityRequestSchema, evaluatePlausibilityResponseSchema),
}
