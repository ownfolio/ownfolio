import { parse } from 'csv-parse/sync'

import { Transaction, TransactionData, TransactionType } from '../../shared/models/Transaction'
import { selectionSortBy } from '../../shared/utils/array'
import { dateParse } from '../../shared/utils/date'
import { Database } from '../database'

export async function exportTransactionsCsv(db: Database, userId: string): Promise<string> {
  const accounts = await db.accounts.listByUserId(userId)
  const assets = await db.assets.listByUserId(userId)
  const transactions = await db.transactions.listByUserId(userId)

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id
  const getAssetName = (id: string) => assets.find(a => a.id === id)?.name || id

  const csvDataRows: CsvData[] = transactions.map(tx => {
    const base: CsvData = {
      ...empty,
      Date: tx.date,
      Time: tx.time,
      Type: tx.data.type,
      Reference: tx.reference,
      Comment: tx.comment,
    }
    const data = ((): Partial<CsvData> => {
      const { data } = tx
      switch (data.type) {
        case 'cashDeposit':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount.toString(),
          }
        case 'cashWithdrawal':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount.toString(),
          }
        case 'cashTransfer':
          return {
            FromCashAccount: getAccountName(data.fromCashAccountId),
            ToCashAccount: getAccountName(data.toCashAccountId),
            CashAmount: data.cashAmount,
            FeeCashAmount: data.feeCashAmount.toString(),
          }
        case 'assetBuy':
          return {
            AssetAccount: getAccountName(data.assetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount,
            FeeCashAmount: data.feeCashAmount,
          }
        case 'assetSell':
          return {
            AssetAccount: getAccountName(data.assetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount,
            FeeCashAmount: data.feeCashAmount,
            TaxCashAmount: data.taxCashAmount,
          }
        case 'assetDeposit':
          return {
            AssetAccount: getAccountName(data.assetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            CashAmount: data.cashAmount,
          }
        case 'assetWithdrawal':
          return {
            AssetAccount: getAccountName(data.assetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            CashAmount: data.cashAmount,
          }
        case 'assetTransfer':
          return {
            FromAssetAccount: getAccountName(data.fromAssetAccountId),
            ToAssetAccount: getAccountName(data.toAssetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            FeeAssetAmount: data.feeAssetAmount,
          }
        case 'interest':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount,
            TaxCashAmount: data.taxCashAmount,
          }
        case 'dividend':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            CashAmount: data.cashAmount,
            AssetAccount: getAccountName(data.assetAccountId),
            Asset: getAssetName(data.assetId),
            AssetAmount: data.assetAmount,
            TaxCashAmount: data.taxCashAmount,
          }
        case 'tax':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            TaxCashAmount: data.taxCashAmount,
          }
        case 'fee':
          return {
            CashAccount: getAccountName(data.cashAccountId),
            FeeCashAmount: data.feeCashAmount,
          }
      }
    })()
    return {
      ...base,
      ...data,
    }
  })

  return renderCsv([header, ...csvDataRows])
}

export async function importTransactionsCsv(db: Database, userId: string, csvStr: string): Promise<void> {
  const csvDataRows = selectionSortBy(
    (await parse(csvStr, { delimiter: ',', columns: true })) as CsvData[],
    (a, b) => dateParse(a.Date + 'T' + a.Time).valueOf() - dateParse(b.Date + 'T' + b.Time).valueOf()
  )

  const portfolio = await db.portfolios.create({ name: 'Import', userId, status: 'active' })
  const ensureAccount = async (name: string) => {
    const accounts = await db.accounts.listByUserId(userId)
    const account = accounts.find(a => a.name === name)
    if (account) {
      return account
    }
    return await db.accounts.create({ portfolioId: portfolio.id, name, number: '', currency: 'EUR', status: 'active' })
  }
  const ensureAsset = async (name: string) => {
    const assets = await db.assets.listByUserId(userId)
    const asset = assets.find(a => a.name === name)
    if (asset) {
      return asset
    }
    return await db.assets.create({
      userId,
      symbol: 'XXX',
      name,
      number: '',
      currency: 'EUR',
      denomination: 0,
      quoteProvider: null,
      status: 'active',
    })
  }

  for (const idx in csvDataRows) {
    const csvDataRow = csvDataRows[idx]
    const base: Omit<Transaction, 'id' | 'createdAt' | 'data'> = {
      userId,
      date: csvDataRow.Date,
      time: csvDataRow.Time,
      reference: csvDataRow.Reference,
      comment: csvDataRow.Comment,
    }
    const data: TransactionData = await (async () => {
      switch (csvDataRow.Type) {
        case 'cashDeposit': {
          const account = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'cashDeposit',
            cashAccountId: account.id,
            cashAmount: csvDataRow.CashAmount,
          } as Extract<TransactionData, { type: 'cashDeposit' }>
        }
        case 'cashWithdrawal': {
          const account = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'cashWithdrawal',
            cashAccountId: account.id,
            cashAmount: csvDataRow.CashAmount,
          } as Extract<TransactionData, { type: 'cashWithdrawal' }>
        }
        case 'cashTransfer': {
          const fromCashAccount = await ensureAccount(csvDataRow.FromCashAccount)
          const toCashAccount = await ensureAccount(csvDataRow.ToCashAccount)
          return {
            type: 'cashTransfer',
            fromCashAccountId: fromCashAccount.id,
            toCashAccountId: toCashAccount.id,
            cashAmount: csvDataRow.CashAmount,
            feeCashAmount: csvDataRow.FeeCashAmount,
          } as Extract<TransactionData, { type: 'cashTransfer' }>
        }
        case 'assetBuy': {
          const assetAccount = await ensureAccount(csvDataRow.AssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'assetBuy',
            assetAccountId: assetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            cashAccountId: cashAccount.id,
            cashAmount: csvDataRow.CashAmount,
            feeCashAmount: csvDataRow.FeeCashAmount,
          } as Extract<TransactionData, { type: 'assetBuy' }>
        }
        case 'assetSell': {
          const assetAccount = await ensureAccount(csvDataRow.AssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'assetSell',
            assetAccountId: assetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            cashAccountId: cashAccount.id,
            cashAmount: csvDataRow.CashAmount,
            feeCashAmount: csvDataRow.FeeCashAmount,
            taxCashAmount: csvDataRow.TaxCashAmount,
          } as Extract<TransactionData, { type: 'assetSell' }>
        }
        case 'assetDeposit': {
          const assetAccount = await ensureAccount(csvDataRow.AssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          return {
            type: 'assetDeposit',
            assetAccountId: assetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            cashAmount: csvDataRow.CashAmount,
          } as Extract<TransactionData, { type: 'assetDeposit' }>
        }
        case 'assetWithdrawal': {
          const assetAccount = await ensureAccount(csvDataRow.AssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          return {
            type: 'assetWithdrawal',
            assetAccountId: assetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            cashAmount: csvDataRow.CashAmount,
          } as Extract<TransactionData, { type: 'assetWithdrawal' }>
        }
        case 'assetTransfer': {
          const fromAssetAccount = await ensureAccount(csvDataRow.FromAssetAccount)
          const toAssetAccount = await ensureAccount(csvDataRow.ToAssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          return {
            type: 'assetTransfer',
            fromAssetAccountId: fromAssetAccount.id,
            toAssetAccountId: toAssetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            feeAssetAmount: csvDataRow.FeeAssetAmount,
          } as Extract<TransactionData, { type: 'assetTransfer' }>
        }
        case 'interest': {
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'interest',
            cashAccountId: cashAccount.id,
            cashAmount: csvDataRow.CashAmount,
            taxCashAmount: csvDataRow.TaxCashAmount,
          } as Extract<TransactionData, { type: 'interest' }>
        }
        case 'dividend': {
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          const assetAccount = await ensureAccount(csvDataRow.AssetAccount)
          const asset = await ensureAsset(csvDataRow.Asset)
          return {
            type: 'dividend',
            cashAccountId: cashAccount.id,
            cashAmount: csvDataRow.CashAmount,
            assetAccountId: assetAccount.id,
            assetId: asset.id,
            assetAmount: csvDataRow.AssetAmount,
            taxCashAmount: csvDataRow.TaxCashAmount,
          } as Extract<TransactionData, { type: 'dividend' }>
        }
        case 'tax': {
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'tax',
            cashAccountId: cashAccount.id,
            taxCashAmount: csvDataRow.TaxCashAmount,
          } as Extract<TransactionData, { type: 'tax' }>
        }
        case 'fee': {
          const cashAccount = await ensureAccount(csvDataRow.CashAccount)
          return {
            type: 'fee',
            cashAccountId: cashAccount.id,
            feeCashAmount: csvDataRow.FeeCashAmount,
          } as Extract<TransactionData, { type: 'fee' }>
        }
      }
    })()
    await db.transactions.create({ ...base, data })
  }
}

interface CsvData {
  Date: string
  Time: string
  Type: TransactionType
  AssetAccount: string
  Asset: string
  AssetAmount: string
  FromAssetAccount: string
  ToAssetAccount: string
  CashAccount: string
  CashAmount: string
  FromCashAccount: string
  ToCashAccount: string
  FeeCashAmount: string
  TaxCashAmount: string
  FeeAssetAmount: string
  Reference: string
  Comment: string
}

const empty: CsvData = {
  Date: '',
  Time: '',
  Type: '' as any,
  AssetAccount: '',
  Asset: '',
  AssetAmount: '',
  FromAssetAccount: '',
  ToAssetAccount: '',
  CashAccount: '',
  CashAmount: '',
  FromCashAccount: '',
  ToCashAccount: '',
  FeeCashAmount: '',
  TaxCashAmount: '',
  FeeAssetAmount: '',
  Reference: '',
  Comment: '',
}

const header = Object.keys(empty).reduce((acc, key) => ({ ...acc, [key]: key }), empty)

function renderCsv(data: CsvData[]): string {
  if (data.length === 0) {
    return ''
  }
  const columns = Object.keys(data[0])
  return data.reduce((acc, data: any) => {
    return (
      acc +
      columns
        .map(col => {
          const value = data[col]
          if (!value) {
            return ''
          }
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"'
          }
          return value
        })
        .join(',') +
      '\n'
    )
  }, '')
}
