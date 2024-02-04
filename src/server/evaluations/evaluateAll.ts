import BigNumber from 'bignumber.js'

import { Quote } from '../../shared/models/Quote'
import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { findIndexLeft } from '../../shared/utils/array'
import { dateFormat } from '../../shared/utils/date'
import {
  evaluateHistorical,
  evaluateHistoricalWithQuotes,
  evaluateNow,
  EvaluateOpts,
  EvaluationAllQuotes,
  EvaluationResult,
  EvaluationResultDated,
  EvaluationStepFunction,
} from './evaluate'

export interface OpenAssetPosition {
  type: 'open'
  accountId: string
  assetId: string
  amount: BigNumber
  openTransactionId: string
  openDate: string
  openTime: string
  openPrice: BigNumber
}

export interface ClosedAssetPosition extends Omit<OpenAssetPosition, 'type'> {
  type: 'closed'
  closeTransactionId: string
  closeDate: string
  closeTime: string
  closePrice: BigNumber
}

export type AssetPosition = OpenAssetPosition | ClosedAssetPosition

export interface EvaluateAllValue {
  accountCashHoldings: Record<string, BigNumber>
  accountCashInterest: Record<string, BigNumber>
  accountCashDividend: Record<string, BigNumber>
  accountCashFee: Record<string, BigNumber>
  accountCashTax: Record<string, BigNumber>
  accountAssetHoldings: Record<string, Record<string, BigNumber>>
  accountAssetOpenPrices: Record<string, Record<string, BigNumber>>
  accountAssetRealizedProfits: Record<string, Record<string, BigNumber>>
  openAssetPositions: OpenAssetPosition[]
  closedAssetPositions: ClosedAssetPosition[]
}

export type EvaluateAllError = {
  type: 'consumeExcessiveAssetAmount'
  transactionId: string
  assetAccountId: string
  assetId: string
  excessiveAssetAmount: BigNumber
}

export type EvaluateAllResult = EvaluationResult<EvaluateAllValue, EvaluateAllError>

function emptyEvaluateAllResult(): EvaluateAllResult {
  return {
    value: {
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    },
    errors: [],
  }
}

export function evaluateAll(transactions: Transaction[], opts?: Omit<EvaluateOpts<{}>, 'params'>): EvaluateAllResult {
  return evaluateNow(emptyEvaluateAllResult(), transactions, evaluateAllStep, { ...(opts || {}), params: [] })
}

export interface EvaluateHistoricalAllWithQuotesValue extends EvaluateAllValue {
  accountAssetCurrentPrices: Record<string, Record<string, BigNumber>>
}

export type EvaluateHistoricalAllWithQuotesError = { type: 'noQuotesForAsset'; assetId: string }

export type EvaluateHistoricalAllWithQuotesResult = EvaluationResultDated<
  EvaluateHistoricalAllWithQuotesValue,
  EvaluateHistoricalAllWithQuotesError
>

export function evaluateHistoricalAllWithQuotes(
  transactions: Transaction[],
  allQuotes: Quote[],
  dates: Date[]
): EvaluateHistoricalAllWithQuotesResult[] {
  const resultWithoutQuotes = evaluateHistorical(
    emptyEvaluateAllResult(),
    dates.map(d => dateFormat(d, 'yyyy-MM-dd')),
    transactions,
    evaluateAllStep,
    {
      params: {},
    }
  )
  const allQuotesByAssetId = allQuotes.reduce<EvaluationAllQuotes>((acc, q) => {
    return {
      ...acc,
      [q.assetId]: [...(acc[q.assetId] || []), { date: q.date, close: BigNumber(q.close) }],
    }
  }, {})
  return evaluateHistoricalWithQuotes(resultWithoutQuotes, allQuotesByAssetId, (r, quotes) => {
    return {
      date: r.date,
      value: {
        ...r.value,
        accountAssetCurrentPrices: Object.keys(r.value.accountAssetHoldings).reduce<
          EvaluateHistoricalAllWithQuotesResult['value']['accountAssetCurrentPrices']
        >((acc, accountId) => {
          return {
            ...acc,
            [accountId]: Object.keys(r.value.accountAssetHoldings[accountId]).reduce<Record<string, BigNumber>>(
              (acc, assetId) => {
                return {
                  ...acc,
                  [assetId]: quotes[assetId]
                    ? r.value.accountAssetHoldings![accountId][assetId].multipliedBy(quotes[assetId]!)
                    : r.value.accountAssetOpenPrices[accountId][assetId],
                }
              },
              {}
            ),
          }
        }, {}),
      },
      errors: [
        ...Object.keys(r.value.accountAssetHoldings)
          .flatMap(aid => Object.keys(r.value.accountAssetHoldings[aid]))
          .filter(aid => !quotes[aid])
          .map<EvaluateHistoricalAllWithQuotesError>(aid => ({
            type: 'noQuotesForAsset',
            assetId: aid,
          })),
      ],
    }
  })
}

const evaluateAllStep: EvaluationStepFunction<EvaluateAllValue, EvaluateAllError, {}> = (result, transaction) => {
  const { data } = transaction
  switch (data.type) {
    case 'assetBuy':
      return evaluateAllStepAssetBuy(result, transaction, data)
    case 'assetSell':
      return evaluateAllStepAssetSell(result, transaction, data)
    case 'assetDeposit':
      return evaluateAllStepAssetDeposit(result, transaction, data)
    case 'assetWithdrawal':
      return evaluateAllStepAssetWithdrawal(result, transaction, data)
    case 'assetTransfer':
      return evaluateAllStepAssetTransfer(result, transaction, data)
    case 'cashDeposit':
      return evaluateAllStepCashDeposit(result, transaction, data)
    case 'cashWithdrawal':
      return evaluateAllStepCashWithdrawal(result, transaction, data)
    case 'cashTransfer':
      return evaluateAllStepCashTransfer(result, transaction, data)
    case 'interest':
      return evaluateAllStepInterest(result, transaction, data)
    case 'dividend':
      return evaluateAllStepDividend(result, transaction, data)
    case 'tax':
      return evaluateAllStepTax(result, transaction, data)
    case 'fee':
      return evaluateAllStepFee(result, transaction, data)
  }
}

function evaluateAllStepCashDeposit(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'cashDeposit' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
    }),
  })
  return result2
}

function evaluateAllStepCashWithdrawal(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'cashWithdrawal' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).minus(data.cashAmount),
    }),
  })
  return result2
}

function evaluateAllStepCashTransfer(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'cashTransfer' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.fromCashAccountId]: sum => BigNumber(sum || 0).minus(data.feeCashAmount),
    }),
    accountCashFee: upsertRecord(result.value.accountCashFee, {
      [data.fromCashAccountId]: sum => BigNumber(sum || 0).plus(data.feeCashAmount),
    }),
  })
  const result3 =
    data.fromCashAccountId !== data.toCashAccountId
      ? updateValue(result2, {
          accountCashHoldings: upsertRecord(result2.value.accountCashHoldings, {
            [data.fromCashAccountId]: sum => BigNumber(sum || 0).minus(data.cashAmount),
            [data.toCashAccountId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
          }),
        })
      : result2
  return result3
}

function evaluateAllStepAssetBuy(
  result: EvaluateAllResult,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetBuy' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum =>
        BigNumber(sum || 0)
          .minus(data.cashAmount)
          .minus(data.feeCashAmount),
    }),
    accountCashFee: upsertRecord(result.value.accountCashFee, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.feeCashAmount),
    }),
  })
  const createdPosition: OpenAssetPosition = {
    type: 'open',
    accountId: data.assetAccountId,
    assetId: data.assetId,
    amount: BigNumber(data.assetAmount),
    openTransactionId: transaction.id,
    openDate: transaction.date,
    openTime: transaction.time,
    openPrice: BigNumber(data.cashAmount),
  }
  const result3 = updateValue(result2, {
    accountAssetHoldings: upsertRecord(result2.value.accountAssetHoldings, {
      [data.assetAccountId]: holdings =>
        upsertRecord(holdings || {}, {
          [data.assetId]: sum => BigNumber(sum || 0).plus(data.assetAmount),
        }),
    }),
    openAssetPositions: [...result2.value.openAssetPositions, createdPosition],
    accountAssetOpenPrices: upsertRecord(result2.value.accountAssetOpenPrices, {
      [data.assetAccountId]: holdings =>
        upsertRecord(holdings || {}, {
          [data.assetId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
        }),
    }),
  })
  return result3
}

function evaluateAllStepAssetSell(
  result: EvaluateAllResult,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetSell' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum =>
        BigNumber(sum || 0)
          .plus(data.cashAmount)
          .minus(data.feeCashAmount)
          .minus(data.taxCashAmount),
    }),
    accountCashFee: upsertRecord(result.value.accountCashFee, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.feeCashAmount),
    }),
    accountCashTax: upsertRecord(result.value.accountCashTax, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.taxCashAmount),
    }),
  })
  const result3 = iterate<BigNumber, EvaluateAllResult>(
    BigNumber(data.assetAmount),
    remainingAmount => !remainingAmount.gt(0),
    result2,
    (remainingAmount, acc) => {
      const assetOpenPositionIndex = findIndexLeft(
        acc.value.openAssetPositions,
        p => p.accountId === data.assetAccountId && p.assetId === data.assetId
      )
      if (assetOpenPositionIndex < 0) {
        return [
          BigNumber(0),
          appendError(acc, {
            type: 'consumeExcessiveAssetAmount',
            transactionId: transaction.id,
            assetAccountId: data.assetAccountId,
            assetId: data.assetId,
            excessiveAssetAmount: remainingAmount,
          }),
        ]
      }
      const assetOpenPosition = acc.value.openAssetPositions[assetOpenPositionIndex]
      const consumedAmount = BigNumber.min(assetOpenPosition.amount, remainingAmount)
      const consumedPrice = BigNumber(assetOpenPosition.openPrice)
        .multipliedBy(consumedAmount)
        .dividedBy(assetOpenPosition.amount)
      const assetOpenPositionUpdated: AssetPosition = {
        ...assetOpenPosition,
        amount: assetOpenPosition.amount.minus(consumedAmount),
        openPrice: assetOpenPosition.openPrice.minus(consumedPrice),
      }
      const closePrice = BigNumber(data.cashAmount).multipliedBy(consumedAmount).dividedBy(data.assetAmount)
      const assetClosedPositionCreated: AssetPosition = {
        ...assetOpenPosition,
        type: 'closed',
        amount: consumedAmount,
        openPrice: consumedPrice,
        closeTransactionId: transaction.id,
        closeDate: transaction.date,
        closeTime: transaction.time,
        closePrice: closePrice,
      }
      return [
        remainingAmount.minus(consumedAmount),
        updateValue(acc, {
          accountAssetHoldings: upsertRecord(acc.value.accountAssetHoldings, {
            [data.assetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedAmount),
              }),
          }),
          openAssetPositions: [
            ...acc.value.openAssetPositions.slice(0, assetOpenPositionIndex),
            ...(BigNumber(assetOpenPositionUpdated.amount).gt(0) ? [assetOpenPositionUpdated] : []),
            ...acc.value.openAssetPositions.slice(assetOpenPositionIndex + 1),
          ],
          closedAssetPositions: [...acc.value.closedAssetPositions, assetClosedPositionCreated],
          accountAssetOpenPrices: upsertRecord(acc.value.accountAssetOpenPrices, {
            [data.assetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedPrice),
              }),
          }),
          accountAssetRealizedProfits: upsertRecord(acc.value.accountAssetRealizedProfits, {
            [data.assetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum =>
                  BigNumber(sum || 0)
                    .plus(closePrice)
                    .minus(consumedPrice),
              }),
          }),
        }),
      ]
    }
  )
  return result3
}

function evaluateAllStepAssetDeposit(
  result: EvaluateAllResult,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetDeposit' }>
): EvaluateAllResult {
  const createdPosition: AssetPosition = {
    type: 'open',
    accountId: data.assetAccountId,
    assetId: data.assetId,
    amount: BigNumber(data.assetAmount),
    openTransactionId: transaction.id,
    openDate: transaction.date,
    openTime: transaction.time,
    openPrice: BigNumber(data.cashAmount),
  }
  const result2 = updateValue(result, {
    accountAssetHoldings: upsertRecord(result.value.accountAssetHoldings, {
      [data.assetAccountId]: holdings =>
        upsertRecord(holdings || {}, {
          [data.assetId]: sum => BigNumber(sum || 0).plus(data.assetAmount),
        }),
    }),
    openAssetPositions: [...result.value.openAssetPositions, createdPosition],
    accountAssetOpenPrices: upsertRecord(result.value.accountAssetOpenPrices, {
      [data.assetAccountId]: holdings =>
        upsertRecord(holdings || {}, {
          [data.assetId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
        }),
    }),
  })
  return result2
}

function evaluateAllStepAssetWithdrawal(
  result: EvaluateAllResult,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetWithdrawal' }>
): EvaluateAllResult {
  const result2 = iterate<BigNumber, EvaluateAllResult>(
    BigNumber(data.assetAmount),
    remainingAmount => !remainingAmount.gt(0),
    result,
    (remainingAmount, acc) => {
      const assetOpenPositionIndex = findIndexLeft(
        acc.value.openAssetPositions,
        p => p.type === 'open' && p.accountId === data.assetAccountId && p.assetId === data.assetId
      )
      if (assetOpenPositionIndex < 0) {
        return [
          BigNumber(0),
          appendError(acc, {
            type: 'consumeExcessiveAssetAmount',
            transactionId: transaction.id,
            assetAccountId: data.assetAccountId,
            assetId: data.assetId,
            excessiveAssetAmount: remainingAmount,
          }),
        ]
      }
      const assetOpenPosition = acc.value.openAssetPositions[assetOpenPositionIndex]
      const consumedAmount = BigNumber.min(assetOpenPosition.amount, remainingAmount)
      const consumedPrice = BigNumber(assetOpenPosition.openPrice)
        .multipliedBy(consumedAmount)
        .dividedBy(assetOpenPosition.amount)
      const assetOpenPositionUpdated: AssetPosition = {
        ...assetOpenPosition,
        amount: BigNumber(assetOpenPosition.amount).minus(consumedAmount),
        openPrice: BigNumber(assetOpenPosition.openPrice).minus(consumedPrice),
      }
      return [
        remainingAmount.minus(consumedAmount),
        updateValue(acc, {
          accountAssetHoldings: upsertRecord(acc.value.accountAssetHoldings, {
            [data.assetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedAmount),
              }),
          }),
          openAssetPositions: [
            ...acc.value.openAssetPositions.slice(0, assetOpenPositionIndex),
            ...(BigNumber(assetOpenPositionUpdated.amount).gt(0) ? [assetOpenPositionUpdated] : []),
            ...acc.value.openAssetPositions.slice(assetOpenPositionIndex + 1),
          ],
          accountAssetOpenPrices: upsertRecord(acc.value.accountAssetOpenPrices, {
            [data.assetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedPrice),
              }),
          }),
        }),
      ]
    }
  )
  return result2
}

function evaluateAllStepAssetTransfer(
  result: EvaluateAllResult,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetTransfer' }>
): EvaluateAllResult {
  const result2 = iterate<BigNumber, EvaluateAllResult>(
    BigNumber(data.feeAssetAmount),
    remainingAmount => !remainingAmount.gt(0),
    result,
    (remainingAmount, acc) => {
      const assetOpenPositionIndex = findIndexLeft(
        acc.value.openAssetPositions,
        p => p.type === 'open' && p.accountId === data.fromAssetAccountId && p.assetId === data.assetId
      )
      if (assetOpenPositionIndex < 0) {
        return [
          BigNumber(0),
          appendError(acc, {
            type: 'consumeExcessiveAssetAmount',
            transactionId: transaction.id,
            assetAccountId: data.fromAssetAccountId,
            assetId: data.assetId,
            excessiveAssetAmount: remainingAmount,
          }),
        ]
      }
      const assetOpenPosition = acc.value.openAssetPositions[assetOpenPositionIndex]
      const consumedAmount = BigNumber.min(assetOpenPosition.amount, remainingAmount)
      const consumedPrice = BigNumber(assetOpenPosition.openPrice)
        .multipliedBy(consumedAmount)
        .dividedBy(assetOpenPosition.amount)
      const assetOpenPositionUpdated: AssetPosition = {
        ...assetOpenPosition,
        amount: BigNumber(assetOpenPosition.amount).minus(consumedAmount),
        openPrice: BigNumber(assetOpenPosition.openPrice).minus(consumedPrice),
      }
      return [
        remainingAmount.minus(consumedAmount),
        updateValue(acc, {
          accountCashFee: upsertRecord(result.value.accountCashFee, {
            [data.fromAssetAccountId]: sum => BigNumber(sum || 0).plus(consumedPrice),
          }),
          accountAssetHoldings: upsertRecord(acc.value.accountAssetHoldings, {
            [data.fromAssetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedAmount),
              }),
          }),
          openAssetPositions: [
            ...acc.value.openAssetPositions.slice(0, assetOpenPositionIndex),
            ...(BigNumber(assetOpenPositionUpdated.amount).gt(0) ? [assetOpenPositionUpdated] : []),
            ...acc.value.openAssetPositions.slice(assetOpenPositionIndex + 1),
          ],
          accountAssetOpenPrices: upsertRecord(acc.value.accountAssetOpenPrices, {
            [data.fromAssetAccountId]: holdings =>
              upsertRecord(holdings || {}, {
                [data.assetId]: sum => BigNumber(sum || 0).minus(consumedPrice),
              }),
          }),
        }),
      ]
    }
  )
  const result3 =
    data.fromAssetAccountId !== data.toAssetAccountId
      ? iterate<BigNumber, EvaluateAllResult>(
          BigNumber(data.assetAmount),
          remainingAmount => !remainingAmount.gt(0),
          result2,
          (remainingAmount, acc) => {
            const assetOpenPositionIndex = findIndexLeft(
              acc.value.openAssetPositions,
              p => p.type === 'open' && p.accountId === data.fromAssetAccountId && p.assetId === data.assetId
            )
            if (assetOpenPositionIndex < 0) {
              return [
                BigNumber(0),
                appendError(acc, {
                  type: 'consumeExcessiveAssetAmount',
                  transactionId: transaction.id,
                  assetAccountId: data.fromAssetAccountId,
                  assetId: data.assetId,
                  excessiveAssetAmount: remainingAmount,
                }),
              ]
            }
            const assetOpenPosition = acc.value.openAssetPositions[assetOpenPositionIndex]
            const consumedAmount = BigNumber.min(assetOpenPosition.amount, remainingAmount)
            const consumedPrice = BigNumber(assetOpenPosition.openPrice)
              .multipliedBy(consumedAmount)
              .dividedBy(assetOpenPosition.amount)
            const assetOpenPositionUpdated: AssetPosition = {
              ...assetOpenPosition,
              amount: BigNumber(assetOpenPosition.amount).minus(consumedAmount),
              openPrice: BigNumber(assetOpenPosition.openPrice).minus(consumedPrice),
            }
            const assetOpenPositionCreated: AssetPosition = {
              type: 'open',
              accountId: data.toAssetAccountId,
              assetId: data.assetId,
              amount: consumedAmount,
              openTransactionId: assetOpenPosition.openTransactionId,
              openDate: assetOpenPosition.openDate,
              openTime: assetOpenPosition.openTime,
              openPrice: consumedPrice,
            }
            return [
              remainingAmount.minus(consumedAmount),
              updateValue(acc, {
                accountAssetHoldings: upsertRecord(acc.value.accountAssetHoldings, {
                  [data.fromAssetAccountId]: holdings =>
                    upsertRecord(holdings || {}, {
                      [data.assetId]: sum => BigNumber(sum || 0).minus(consumedAmount),
                    }),
                  [data.toAssetAccountId]: holdings =>
                    upsertRecord(holdings || {}, {
                      [data.assetId]: sum => BigNumber(sum || 0).plus(consumedAmount),
                    }),
                }),
                openAssetPositions: [
                  ...acc.value.openAssetPositions.slice(0, assetOpenPositionIndex),
                  ...(BigNumber(assetOpenPositionUpdated.amount).gt(0) ? [assetOpenPositionUpdated] : []),
                  ...acc.value.openAssetPositions.slice(assetOpenPositionIndex + 1),
                  assetOpenPositionCreated,
                ],
                accountAssetOpenPrices: upsertRecord(acc.value.accountAssetOpenPrices, {
                  [data.fromAssetAccountId]: holdings =>
                    upsertRecord(holdings || {}, {
                      [data.assetId]: sum => BigNumber(sum || 0).minus(consumedPrice),
                    }),
                  [data.toAssetAccountId]: holdings =>
                    upsertRecord(holdings || {}, {
                      [data.assetId]: sum => BigNumber(sum || 0).plus(consumedPrice),
                    }),
                }),
              }),
            ]
          }
        )
      : result2
  return result3
}

function evaluateAllStepInterest(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'interest' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum =>
        BigNumber(sum || 0)
          .plus(data.cashAmount)
          .minus(data.taxCashAmount),
    }),
    accountCashInterest: upsertRecord(result.value.accountCashInterest, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
    }),
    accountCashTax: upsertRecord(result.value.accountCashTax, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.taxCashAmount),
    }),
  })
  return result2
}

function evaluateAllStepDividend(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'dividend' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum =>
        BigNumber(sum || 0)
          .plus(data.cashAmount)
          .minus(data.taxCashAmount),
    }),
    accountCashDividend: upsertRecord(result.value.accountCashDividend, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.cashAmount),
    }),
    accountCashTax: upsertRecord(result.value.accountCashTax, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.taxCashAmount),
    }),
  })
  return result2
}

function evaluateAllStepTax(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'tax' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).minus(data.taxCashAmount),
    }),
    accountCashTax: upsertRecord(result.value.accountCashTax, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.taxCashAmount),
    }),
  })
  return result2
}

function evaluateAllStepFee(
  result: EvaluateAllResult,
  _transaction: Transaction,
  data: Extract<TransactionData, { type: 'fee' }>
): EvaluateAllResult {
  const result2 = updateValue(result, {
    accountCashHoldings: upsertRecord(result.value.accountCashHoldings, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).minus(data.feeCashAmount),
    }),
    accountCashFee: upsertRecord(result.value.accountCashFee, {
      [data.cashAccountId]: sum => BigNumber(sum || 0).plus(data.feeCashAmount),
    }),
  })
  return result2
}

function upsertRecord<T>(
  record: Record<string, T>,
  fns: { [key: string]: (value: T | undefined) => T }
): Record<string, T> {
  return Object.keys(fns).reduce<Record<string, T>>((acc, key) => {
    return {
      ...acc,
      [key]: fns[key](record[key] || undefined),
    }
  }, record)
}

function updateValue(result: EvaluateAllResult, values: Partial<EvaluateAllValue>): EvaluateAllResult {
  return {
    ...result,
    value: {
      ...result.value,
      ...values,
    },
  }
}

function appendError(result: EvaluateAllResult, error: EvaluateAllError): EvaluateAllResult {
  return {
    ...result,
    errors: [...result.errors, error],
  }
}

function iterate<S, T>(
  initialState: S,
  stateDone: (state: S) => boolean,
  initialValue: T,
  fn: (state: S, value: T) => [S, T]
): T {
  let state = initialState
  let value = initialValue
  let count = 0
  while (!stateDone(state)) {
    count = count + 1
    if (count > 10000) {
      throw new Error('Too many open positions')
    }
    const [nextState, nextValue] = fn(state, value)
    state = nextState
    value = nextValue
  }
  return value
}
