import { z } from 'zod'

import { dateFormat } from '../utils/date'
import { formatInt } from '../utils/string'

export const transactionDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cashDeposit'),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('cashWithdrawal'),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('cashTransfer'),
    fromCashAccountId: z.string(),
    toCashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    feeCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('assetBuy'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    feeCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('assetSell'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    feeCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    taxCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('assetDeposit'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('assetWithdrawal'),
    assetId: z.string(),
    assetAccountId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('assetTransfer'),
    assetId: z.string(),
    fromAssetAccountId: z.string(),
    toAssetAccountId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    feeAssetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('interest'),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    taxCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('dividend'),
    cashAccountId: z.string(),
    cashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    assetId: z.string(),
    assetAccountId: z.string(),
    assetAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    taxCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('tax'),
    cashAccountId: z.string(),
    taxCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
  z.object({
    type: z.literal('fee'),
    cashAccountId: z.string(),
    feeCashAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
  }),
])

export type TransactionData = z.infer<typeof transactionDataSchema>

export type TransactionType = TransactionData['type']

export const allTransactionTypes = [
  { type: 'cashDeposit', name: 'Cash Deposit' },
  { type: 'cashWithdrawal', name: 'Cash Withdrawal' },
  { type: 'cashTransfer', name: 'Cash Transfer' },
  { type: 'assetBuy', name: 'Asset Buy' },
  { type: 'assetSell', name: 'Asset Sell' },
  { type: 'assetDeposit', name: 'Asset Deposit' },
  { type: 'assetWithdrawal', name: 'Asset Withdrawal' },
  { type: 'assetTransfer', name: 'Asset Transfer' },
  { type: 'interest', name: 'Interest' },
  { type: 'dividend', name: 'Dividend' },
  { type: 'tax', name: 'Tax' },
  { type: 'fee', name: 'Fee' },
]

export const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/),
  time: z.string().regex(/^(\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)$/),
  data: transactionDataSchema,
  reference: z.string().max(64),
  comment: z.string().max(4096),
  createdAt: z.string().datetime(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const transactionSearchSchema = z.object({
  type: z.string().optional(),
  fromDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})$/)
    .optional(),
  portfolioId: z.string().optional(),
  accountId: z.string().optional(),
  assetId: z.string().optional(),
  reference: z.string().optional(),
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>

export function createEmptyTransaction(): Omit<Transaction, 'data'> {
  return {
    id: '',
    userId: '',
    date: dateFormat(new Date(), 'yyyy-MM-dd'),
    time: '00:00:00',
    reference: '',
    comment: '',
    createdAt: '',
  }
}

export function createEmptyTransactionData(type: TransactionType, previousData?: TransactionData): TransactionData {
  const prev = (key: string): string | undefined => (previousData as any)?.[key] || undefined
  switch (type) {
    case 'cashDeposit':
      return {
        type: 'cashDeposit',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
      }
    case 'cashWithdrawal':
      return {
        type: 'cashWithdrawal',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
      }
    case 'cashTransfer':
      return {
        type: 'cashTransfer',
        toCashAccountId: prev('toCashAccountId') || '',
        fromCashAccountId: prev('fromCashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
        feeCashAmount: prev('feeCashAmount') || '',
      }
    case 'assetBuy':
      return {
        type: 'assetBuy',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
        feeCashAmount: prev('feeCashAmount') || '',
      }
    case 'assetSell':
      return {
        type: 'assetSell',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
        feeCashAmount: prev('feeCashAmount') || '',
        taxCashAmount: prev('taxCashAmount') || '',
      }
    case 'assetTransfer':
      return {
        type: 'assetTransfer',
        fromAssetAccountId: prev('fromAssetAccountId') || '',
        toAssetAccountId: prev('toAssetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        feeAssetAmount: prev('feeAssetAmount') || '',
      }
    case 'assetDeposit':
      return {
        type: 'assetDeposit',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        cashAmount: prev('cashAmount') || '',
      }
    case 'assetWithdrawal':
      return {
        type: 'assetWithdrawal',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        cashAmount: prev('cashAmount') || '',
      }
    case 'interest':
      return {
        type: 'interest',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
        taxCashAmount: prev('taxCashAmount') || '',
      }
    case 'dividend':
      return {
        type: 'dividend',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || '',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || '',
        taxCashAmount: prev('taxCashAmount') || '',
      }
    case 'tax':
      return {
        type: 'tax',
        cashAccountId: prev('cashAccountId') || '',
        taxCashAmount: prev('taxCashAmount') || prev('feeCashAmount') || '',
      }
    case 'fee':
      return {
        type: 'fee',
        cashAccountId: prev('cashAccountId') || '',
        feeCashAmount: prev('feeCashAmount') || prev('taxCashAmount') || '',
      }
  }
}

export function generateTransactionReference(): string {
  const time = Date.now()
  const random = Math.floor(Math.random() * 100000)
  return formatInt(time, 13) + formatInt(random, 6)
}
