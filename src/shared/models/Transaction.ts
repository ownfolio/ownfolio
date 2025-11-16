import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { bigNumberFormat } from '../utils/bignumber'
import { dateFormat } from '../utils/date'
import { bigNumberSchema } from '../utils/schemas'
import { formatInt } from '../utils/string'
import { Account } from './Account'
import { Asset } from './Asset'
import { currenciesList } from './Currency'

export const transactionDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cashDeposit'),
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('cashWithdrawal'),
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('cashTransfer'),
    fromCashAccountId: z.string(),
    toCashAccountId: z.string(),
    cashAmount: bigNumberSchema,
    feeCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('assetBuy'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: bigNumberSchema,
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
    feeCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('assetSell'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: bigNumberSchema,
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
    feeCashAmount: bigNumberSchema,
    taxCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('assetDeposit'),
    assetAccountId: z.string(),
    assetId: z.string(),
    assetAmount: bigNumberSchema,
    cashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('assetWithdrawal'),
    assetId: z.string(),
    assetAccountId: z.string(),
    assetAmount: bigNumberSchema,
    cashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('assetTransfer'),
    assetId: z.string(),
    fromAssetAccountId: z.string(),
    toAssetAccountId: z.string(),
    assetAmount: bigNumberSchema,
    feeAssetAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('interest'),
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
    taxCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('dividend'),
    cashAccountId: z.string(),
    cashAmount: bigNumberSchema,
    assetId: z.string(),
    assetAccountId: z.string(),
    assetAmount: bigNumberSchema,
    taxCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('tax'),
    cashAccountId: z.string(),
    taxCashAmount: bigNumberSchema,
  }),
  z.object({
    type: z.literal('fee'),
    cashAccountId: z.string(),
    feeCashAmount: bigNumberSchema,
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
  attachmentId: z.string().optional(),
  reference: z.string().optional(),
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>

export const transactionSearchResultSchema = transactionSchema.extend({ attachmentIds: z.array(z.string()) })

export type TransactionSearchResult = z.infer<typeof transactionSearchResultSchema>

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
  function prev<T>(key: string): T | undefined {
    return ((previousData as any)?.[key] as T) || undefined
  }
  switch (type) {
    case 'cashDeposit':
      return {
        type: 'cashDeposit',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
      }
    case 'cashWithdrawal':
      return {
        type: 'cashWithdrawal',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
      }
    case 'cashTransfer':
      return {
        type: 'cashTransfer',
        toCashAccountId: prev('toCashAccountId') || '',
        fromCashAccountId: prev('fromCashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
        feeCashAmount: prev('feeCashAmount') || BigNumber(0),
      }
    case 'assetBuy':
      return {
        type: 'assetBuy',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
        feeCashAmount: prev('feeCashAmount') || BigNumber(0),
      }
    case 'assetSell':
      return {
        type: 'assetSell',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
        feeCashAmount: prev('feeCashAmount') || BigNumber(0),
        taxCashAmount: prev('taxCashAmount') || BigNumber(0),
      }
    case 'assetTransfer':
      return {
        type: 'assetTransfer',
        fromAssetAccountId: prev('fromAssetAccountId') || '',
        toAssetAccountId: prev('toAssetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        feeAssetAmount: prev('feeAssetAmount') || BigNumber(0),
      }
    case 'assetDeposit':
      return {
        type: 'assetDeposit',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        cashAmount: prev('cashAmount') || BigNumber(0),
      }
    case 'assetWithdrawal':
      return {
        type: 'assetWithdrawal',
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        cashAmount: prev('cashAmount') || BigNumber(0),
      }
    case 'interest':
      return {
        type: 'interest',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
        taxCashAmount: prev('taxCashAmount') || BigNumber(0),
      }
    case 'dividend':
      return {
        type: 'dividend',
        cashAccountId: prev('cashAccountId') || '',
        cashAmount: prev('cashAmount') || BigNumber(0),
        assetAccountId: prev('assetAccountId') || '',
        assetId: prev('assetId') || '',
        assetAmount: prev('assetAmount') || BigNumber(0),
        taxCashAmount: prev('taxCashAmount') || BigNumber(0),
      }
    case 'tax':
      return {
        type: 'tax',
        cashAccountId: prev('cashAccountId') || '',
        taxCashAmount: prev('taxCashAmount') || prev('feeCashAmount') || BigNumber(0),
      }
    case 'fee':
      return {
        type: 'fee',
        cashAccountId: prev('cashAccountId') || '',
        feeCashAmount: prev('feeCashAmount') || prev('taxCashAmount') || BigNumber(0),
      }
  }
}

export function generateTransactionReference(): string {
  const time = Date.now()
  const random = Math.floor(Math.random() * 100000)
  return formatInt(time, 13) + formatInt(random, 6)
}

export function renderTransactionAsString(
  transaction: Transaction,
  accounts: Account[],
  assets: Asset[],
  includeDate: boolean
): string {
  const { data } = transaction
  const dateStr = includeDate ? `${transaction.date} ` : ''
  switch (data.type) {
    case 'cashDeposit': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return dateStr + `Deposit ${formatAmount(data.cashAmount, currency)} to ${cashAccount?.name || '???'}`
    }
    case 'cashWithdrawal': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return dateStr + `Withdraw ${formatAmount(data.cashAmount, currency)} from ${cashAccount?.name || '???'}`
    }
    case 'cashTransfer': {
      const fromCashAccount = accounts.find(a => a.id === data.fromCashAccountId)
      const toCashAccount = accounts.find(a => a.id === data.toCashAccountId)
      const currency = currenciesList.find(c => c.symbol === fromCashAccount?.currency)
      return (
        dateStr +
        `Transfer ${formatAmount(data.cashAmount, currency)} from ${fromCashAccount?.name || '???'} to ${toCashAccount?.name || '???'}`
      )
    }
    case 'assetBuy': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        dateStr +
        `Buy ${formatAmount(data.assetAmount, asset)} on ${assetAccount?.name || '???'} for ${formatAmount(data.cashAmount, currency)} on ${cashAccount?.name || '???'}`
      )
    }
    case 'assetSell': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        dateStr +
        `Sell ${formatAmount(data.assetAmount, asset)} on ${assetAccount?.name || '???'} for ${formatAmount(data.cashAmount, currency)} on ${cashAccount?.name || '???'}`
      )
    }
    case 'assetDeposit': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      return dateStr + `Deposit ${formatAmount(data.assetAmount, asset)} to ${assetAccount?.name || '???'}`
    }
    case 'assetWithdrawal': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      return dateStr + `Withdraw ${formatAmount(data.assetAmount, asset)} from ${assetAccount?.name || '???'}`
    }
    case 'assetTransfer': {
      const asset = assets.find(a => a.id === data.assetId)
      const fromAssetAccount = accounts.find(a => a.id === data.fromAssetAccountId)
      const toAssetAccount = accounts.find(a => a.id === data.toAssetAccountId)
      return (
        dateStr +
        `Transfer ${formatAmount(data.assetAmount, asset)} from ${fromAssetAccount?.name || '???'} to ${toAssetAccount?.name || '???'}`
      )
    }
    case 'interest': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return dateStr + `Receive ${formatAmount(data.cashAmount, currency)} interest to ${cashAccount?.name || '???'}`
    }
    case 'dividend': {
      const asset = assets.find(a => a.id === data.assetId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        dateStr +
        `Receive ${formatAmount(data.cashAmount, currency)} dividend to ${cashAccount?.name || '???'} for ${formatAmount(data.assetAmount, asset)}`
      )
    }
    case 'tax': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return dateStr + `Pay ${formatAmount(data.taxCashAmount, currency)} tax from ${cashAccount?.name || '???'}`
    }
    case 'fee': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return dateStr + `Pay ${formatAmount(data.feeCashAmount, currency)} fee from ${cashAccount?.name || '???'}`
    }
  }
}

function formatAmount(
  n: BigNumber.Value,
  currencyOrAsset: { denomination: number; symbol: string } | undefined
): string {
  return bigNumberFormat(n, currencyOrAsset?.denomination || 0) + ' ' + currencyOrAsset?.symbol || '???'
}
