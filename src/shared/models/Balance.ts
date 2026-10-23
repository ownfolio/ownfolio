import { z } from 'zod'

import { bigNumberSchema, dateStringSchema, timeStringSchema } from '../utils/schemas'

export const openPositionSchema = z.object({
  state: z.literal('open'),
  accountId: z.string().describe('ID of the account holding the position'),
  amount: bigNumberSchema.describe('Held amount: units of the asset, or cash in the account currency'),
  openTransactionId: z.string().describe('ID of the transaction that opened the position'),
  openDate: dateStringSchema.describe('Date the position was opened (YYYY-MM-DD)'),
  openTime: timeStringSchema.describe('Time the position was opened'),
  openPrice: bigNumberSchema.describe(
    'Total cost basis of the whole position in the account currency (not per unit), excluding fees'
  ),
})

export type OpenPosition = z.infer<typeof openPositionSchema>

export const closedPositionSchema = z.object({
  ...openPositionSchema.shape,
  state: z.literal('closed'),
  closeTransactionId: z.string().describe('ID of the transaction that closed the position'),
  closeDate: dateStringSchema.describe('Date the position was closed (YYYY-MM-DD)'),
  closeTime: timeStringSchema.describe('Time the position was closed'),
  closePrice: bigNumberSchema.describe(
    'Total proceeds of the whole position in the account currency (not per unit), before fees and taxes. closePrice minus openPrice is the realized profit'
  ),
})

export type ClosedPosition = z.infer<typeof closedPositionSchema>

export const openAssetPositionSchema = z.object({
  ...openPositionSchema.shape,
  type: z.literal('asset'),
  assetId: z.string().describe('ID of the held asset'),
})

export type OpenAssetPosition = z.infer<typeof openAssetPositionSchema>

export const closedAssetPositionSchema = z.object({
  ...closedPositionSchema.shape,
  type: z.literal('asset'),
  assetId: z.string().describe('ID of the held asset'),
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

export const balanceIssueSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z
        .literal('negativeAssetAmounts')
        .describe('A transaction removes more units of an asset from an account than the account holds'),
      transactionId: z.string().describe('ID of the offending transaction'),
      accountId: z.string().describe('ID of the asset account'),
      assetId: z.string().describe('ID of the asset'),
      exceededAssetAmount: bigNumberSchema.describe('Units that were missing'),
    }),
  ])
  .describe('Inconsistency found while replaying the transactions')

export type BalanceIssue = z.infer<typeof balanceIssueSchema>

export const balanceSchema = z
  .object({
    date: dateStringSchema.describe('Date the balance was evaluated for (YYYY-MM-DD), including all its transactions'),
    time: timeStringSchema.describe('Time of the last transaction included'),
    cashPositions: z
      .object({
        open: z.array(openCashPositionSchema),
        closed: z.array(closedCashPositionSchema),
      })
      .describe('Cash lots per account. The sum of open amounts per account is its cash balance'),
    assetPositions: z
      .object({
        open: z.array(openAssetPositionSchema),
        closed: z.array(closedAssetPositionSchema),
      })
      .describe('Asset lots per account and asset, matched first in, first out (FIFO)'),
    quotes: z
      .record(z.string(), bigNumberSchema)
      .describe('Latest known close price per unit by asset ID as of the date'),
    issues: z.array(balanceIssueSchema).describe('Inconsistencies found up to the date'),
  })
  .describe('Snapshot of all positions of the user at the end of a date, derived by replaying all transactions')

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
