import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { bigNumberFormat } from '../utils/bignumber'
import { dateFormat } from '../utils/date'
import { bigNumberSchema } from '../utils/schemas'
import { formatInt } from '../utils/string'
import { Account } from './Account'
import { Asset } from './Asset'
import { currenciesList } from './Currency'

const cashAccountIdSchema = z.string().describe('ID of the account the cash is booked on')
const assetAccountIdSchema = z.string().describe('ID of the account the asset units are booked on')
const assetIdSchema = z.string().describe('ID of the asset')
const assetAmountSchema = bigNumberSchema.describe('Number of asset units (e.g. shares), positive')
const feeCashAmountSchema = bigNumberSchema.describe(
  'Fees in the cash account currency, positive or "0". Paid in addition to cashAmount'
)
const taxCashAmountSchema = bigNumberSchema.describe('Taxes in the cash account currency, positive or "0"')

// All amounts are positive, the direction of the money and asset flows follows from the type.
export const transactionDataSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('cashDeposit'),
        cashAccountId: cashAccountIdSchema,
        cashAmount: bigNumberSchema.describe('Deposited amount, positive'),
      })
      .describe('Money paid into an account from outside the tracked accounts, e.g. a savings transfer'),
    z
      .object({
        type: z.literal('cashWithdrawal'),
        cashAccountId: cashAccountIdSchema,
        cashAmount: bigNumberSchema.describe('Withdrawn amount, positive'),
      })
      .describe('Money taken out of an account to outside the tracked accounts'),
    z
      .object({
        type: z.literal('cashTransfer'),
        fromCashAccountId: z.string().describe('ID of the account the money leaves'),
        toCashAccountId: z.string().describe('ID of the account the money arrives at'),
        cashAmount: bigNumberSchema.describe('Amount arriving at the target account, positive'),
        feeCashAmount: bigNumberSchema.describe(
          'Transfer fee, positive or "0". Debited from the source account in addition to cashAmount'
        ),
      })
      .describe('Money moved between two tracked accounts. Not counted as deposit or withdrawal'),
    z
      .object({
        type: z.literal('assetBuy'),
        assetAccountId: assetAccountIdSchema,
        assetId: assetIdSchema,
        assetAmount: assetAmountSchema,
        cashAccountId: z.string().describe('ID of the account the purchase is paid from'),
        cashAmount: bigNumberSchema.describe(
          'Total purchase price for all units excluding fees (assetAmount times unit price), positive. Becomes the cost basis'
        ),
        feeCashAmount: feeCashAmountSchema,
      })
      .describe(
        'Purchase of asset units. The cash account is debited cashAmount plus feeCashAmount, the asset account receives assetAmount units. Cash and asset account may be the same account'
      ),
    z
      .object({
        type: z.literal('assetSell'),
        assetAccountId: assetAccountIdSchema,
        assetId: assetIdSchema,
        assetAmount: assetAmountSchema,
        cashAccountId: z.string().describe('ID of the account the proceeds are paid to'),
        cashAmount: bigNumberSchema.describe(
          'Total gross sale price for all units before fees and taxes (assetAmount times unit price), positive'
        ),
        feeCashAmount: bigNumberSchema.describe('Fees in the cash account currency, positive or "0"'),
        taxCashAmount: taxCashAmountSchema,
      })
      .describe(
        'Sale of asset units, matched against the oldest held units first (FIFO). The cash account is credited cashAmount minus feeCashAmount minus taxCashAmount'
      ),
    z
      .object({
        type: z.literal('assetDeposit'),
        assetAccountId: assetAccountIdSchema,
        assetId: assetIdSchema,
        assetAmount: assetAmountSchema,
        cashAmount: bigNumberSchema.describe(
          'Total cost basis of the deposited units in the account currency, positive or "0"'
        ),
      })
      .describe(
        'Asset units arriving from outside the tracked accounts without a payment, e.g. moved in from an untracked broker, gifted or from a corporate action'
      ),
    z
      .object({
        type: z.literal('assetWithdrawal'),
        assetId: assetIdSchema,
        assetAccountId: assetAccountIdSchema,
        assetAmount: assetAmountSchema,
        cashAmount: bigNumberSchema.describe(
          'Total value of the withdrawn units in the account currency at the time of the withdrawal, positive or "0". Used to compute the realized profit'
        ),
      })
      .describe('Asset units leaving to outside the tracked accounts without a payment (FIFO)'),
    z
      .object({
        type: z.literal('assetTransfer'),
        assetId: assetIdSchema,
        fromAssetAccountId: z.string().describe('ID of the account the units leave'),
        toAssetAccountId: z.string().describe('ID of the account the units arrive at'),
        assetAmount: bigNumberSchema.describe('Number of units arriving at the target account, positive'),
        feeAssetAmount: bigNumberSchema.describe(
          'Units retained as fee, positive or "0". Removed from the source account in addition to assetAmount'
        ),
      })
      .describe(
        'Asset units moved between two tracked accounts. The units keep their original cost basis and purchase date'
      ),
    z
      .object({
        type: z.literal('interest'),
        cashAccountId: cashAccountIdSchema,
        cashAmount: bigNumberSchema.describe(
          'Amount credited to the cash account, positive. taxCashAmount is not deducted from it'
        ),
        taxCashAmount: bigNumberSchema.describe(
          'Taxes withheld on the interest, positive or "0". Recorded for reference only, it does not change the balance'
        ),
      })
      .describe('Interest paid on cash'),
    z
      .object({
        type: z.literal('dividend'),
        cashAccountId: z.string().describe('ID of the account the dividend is paid to'),
        cashAmount: bigNumberSchema.describe(
          'Amount credited to the cash account, positive. taxCashAmount is not deducted from it'
        ),
        assetId: z.string().describe('ID of the asset paying the dividend'),
        assetAccountId: z.string().describe('ID of the account holding the asset'),
        assetAmount: bigNumberSchema.describe(
          'Number of held units the dividend was paid for. Recorded for reference only, holdings do not change'
        ),
        taxCashAmount: bigNumberSchema.describe(
          'Taxes withheld on the dividend, positive or "0". Recorded for reference only, it does not change the balance'
        ),
      })
      .describe('Dividend or distribution paid on an asset'),
    z
      .object({
        type: z.literal('tax'),
        cashAccountId: cashAccountIdSchema,
        taxCashAmount: bigNumberSchema.describe('Tax paid, positive. Debited from the cash account'),
      })
      .describe('Standalone tax payment not tied to a trade, e.g. a yearly tax settlement'),
    z
      .object({
        type: z.literal('fee'),
        cashAccountId: cashAccountIdSchema,
        feeCashAmount: bigNumberSchema.describe('Fee paid, positive. Debited from the cash account'),
      })
      .describe('Standalone fee not tied to a trade, e.g. an account maintenance fee'),
  ])
  .describe(
    'Type specific data of a transaction. All amounts are positive, the type determines whether money or units are added or removed. Cash amounts are in the currency of the respective cash account'
  )

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

export const transactionSchema = z
  .object({
    id: z.string().describe('ID of the transaction'),
    userId: z.string().describe('ID of the owning user, set by the server'),
    date: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})$/)
      .describe('Booking date (YYYY-MM-DD). For trades the execution date'),
    time: z
      .string()
      .regex(/^(\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)$/)
      .describe(
        'Local time of day (HH:mm, HH:mm:ss or HH:mm:ss.SSS), "00:00:00" if unknown. Orders transactions within the same date'
      ),
    data: transactionDataSchema,
    reference: z
      .string()
      .max(64)
      .describe('External reference such as the order or booking number of the broker, empty string if none'),
    comment: z.string().max(4096).describe('Free text note, empty string if none'),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'A booking that changes cash and/or asset holdings. All balances, positions and values are derived by replaying the transactions in chronological order'
  )

export type Transaction = z.infer<typeof transactionSchema>

export const transactionSearchSchema = z.object({
  type: z
    .string()
    .optional()
    .describe(`Only transactions of this type, one of ${allTransactionTypes.map(t => t.type).join(', ')}`),
  fromDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})$/)
    .optional()
    .describe('Only transactions on or after this date (YYYY-MM-DD)'),
  toDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})$/)
    .optional()
    .describe('Only transactions on or before this date (YYYY-MM-DD)'),
  portfolioId: z.string().optional().describe('Only transactions involving any account of this portfolio'),
  accountId: z.string().optional().describe('Only transactions involving this account in any role'),
  assetId: z.string().optional().describe('Only transactions involving this asset'),
  attachmentId: z.string().optional().describe('Only transactions linked to this attachment'),
  reference: z.string().optional().describe('Only transactions with exactly this reference'),
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>

export const transactionSearchResultSchema = transactionSchema.extend({
  attachmentIds: z.array(z.string()).describe('IDs of the attachments linked to the transaction'),
})

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
