import { z } from 'zod'

import { bigNumberSchema, dateStringSchema, timeStringSchema } from '../utils/schemas'

export const openPositionSchema = z.object({
  state: z.literal('open'),
  accountId: z.string(),
  amount: bigNumberSchema,
  openTransactionId: z.string(),
  openDate: dateStringSchema,
  openTime: timeStringSchema,
  openPrice: bigNumberSchema,
})

export type OpenPosition = z.infer<typeof openPositionSchema>

export const closedPositionSchema = z.object({
  ...openPositionSchema.shape,
  state: z.literal('closed'),
  closeTransactionId: z.string(),
  closeDate: dateStringSchema,
  closeTime: timeStringSchema,
  closePrice: bigNumberSchema,
})

export type ClosedPosition = z.infer<typeof closedPositionSchema>

export const openAssetPositionSchema = z.object({
  ...openPositionSchema.shape,
  type: z.literal('asset'),
  assetId: z.string(),
})

export type OpenAssetPosition = z.infer<typeof openAssetPositionSchema>

export const closedAssetPositionSchema = z.object({
  ...closedPositionSchema.shape,
  type: z.literal('asset'),
  assetId: z.string(),
})

export type ClosedAssetPosition = z.infer<typeof closedAssetPositionSchema>

export const assetPositionSchema = z.discriminatedUnion('state', [openAssetPositionSchema, closedAssetPositionSchema])

export type AssetPosition = z.infer<typeof assetPositionSchema>

export const openCashPositionSchema = z.object({
  ...openPositionSchema.shape,
  type: z.literal('cash'),
})

export type OpenCashPosition = z.infer<typeof openCashPositionSchema>

export const closedCashPositionSchema = z.object({
  ...closedPositionSchema.shape,
  type: z.literal('cash'),
})

export type ClosedCashPosition = z.infer<typeof closedCashPositionSchema>

export const cashPositionSchema = z.discriminatedUnion('state', [openCashPositionSchema, closedCashPositionSchema])

export type CashPosition = z.infer<typeof cashPositionSchema>

export const balanceIssueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('negativeAssetAmounts'),
    transactionId: z.string(),
    accountId: z.string(),
    assetId: z.string(),
    exceededAssetAmount: bigNumberSchema,
  }),
])

export type BalanceIssue = z.infer<typeof balanceIssueSchema>

export const balanceSchema = z.object({
  date: dateStringSchema,
  time: timeStringSchema,
  cashPositions: z.object({
    open: z.array(openCashPositionSchema),
    closed: z.array(closedCashPositionSchema),
  }),
  assetPositions: z.object({
    open: z.array(openAssetPositionSchema),
    closed: z.array(closedAssetPositionSchema),
  }),
  quotes: z.record(z.string(), bigNumberSchema),
  issues: z.array(balanceIssueSchema),
})

export type Balance = z.infer<typeof balanceSchema>

export function createEmptyBalance(): Balance {
  return {
    date: '0000-00-00',
    time: '00:00:00',
    cashPositions: {
      open: [],
      closed: [],
    },
    assetPositions: {
      open: [],
      closed: [],
    },
    quotes: {},
    issues: [],
  }
}
