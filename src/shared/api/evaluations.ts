import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { dateUnitSchema } from '../utils/date'
import { dateStringSchema, listResponseSchema, responseSchema } from '../utils/schemas'

export const evaluateSummaryRequestSchema = z.object({
  when: z.discriminatedUnion('type', [
    z.object({ type: z.literal('now') }),
    z.object({ type: z.literal('dates'), dates: z.array(dateStringSchema).min(1) }),
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
    z.object({ type: z.literal('date'), date: dateStringSchema }),
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

export const rpcV1EvaluationsDefinition = {
  evaluateSummary: createRpcCallDefinition(evaluateSummaryRequestSchema, evaluateSummaryResponseSchema),
  evaluatePositions: createRpcCallDefinition(evaluatePositionsRequestSchema, evaluatePositionsResponseSchema),
  evaluatePlausibility: createRpcCallDefinition(evaluatePlausibilityRequestSchema, evaluatePlausibilityResponseSchema),
}
