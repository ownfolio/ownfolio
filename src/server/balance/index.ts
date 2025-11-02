import BigNumber from 'bignumber.js'

import { Quote } from '../../shared/models/Quote'
import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { findIndexLeft, findIndexLeftUntil, mapGroupBy, mergeSortedBy } from '../../shared/utils/array'
import { endBenchmark, startBenchmark, wrapBenchmark } from '../utils/benchmark'

interface OpenPosition {
  state: 'open'
  accountId: string
  amount: BigNumber
  openTransactionId: string
  openDate: string
  openTime: string
  openPrice: BigNumber
}

interface ClosedPosition extends Omit<OpenPosition, 'state'> {
  state: 'closed'
  closeTransactionId: string
  closeDate: string
  closeTime: string
  closePrice: BigNumber
}

export interface OpenAssetPosition extends OpenPosition {
  type: 'asset'
  assetId: string
}

export interface ClosedAssetPosition extends ClosedPosition {
  type: 'asset'
  assetId: string
}

export type AssetPosition = OpenAssetPosition | ClosedAssetPosition

export interface OpenCashPosition extends OpenPosition {
  type: 'cash'
}

export interface ClosedCashPosition extends ClosedPosition {
  type: 'cash'
}

export type CashPosition = OpenCashPosition | ClosedCashPosition

export type BalanceIssue = {
  type: 'negativeAssetAmounts'
  transactionId: string
  accountId: string
  assetId: string
  exceededAssetAmount: BigNumber
}

export interface Balance {
  date: string
  time: string
  cashPositions: {
    open: OpenCashPosition[]
    closed: ClosedCashPosition[]
  }
  assetPositions: {
    open: OpenAssetPosition[]
    closed: ClosedAssetPosition[]
  }
  quotes: {
    [assetId: string]: BigNumber | undefined
  }
  issues: BalanceIssue[]
}

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

export function evaluateBalance(dates: string[], transactions: Transaction[], opts?: { quotes?: Quote[] }): Balance[] {
  return wrapBenchmark('evaluateBalance', () => {
    let nextDateIndex = 0
    let nextTransactionIndex = 0
    const quotesMap = mapGroupBy(opts?.quotes || [], q => q.assetId)
    const nextQuoteIndexes = Object.keys(quotesMap).reduce<{ [assetId: string]: number }>(
      (acc, assetId) => ({ ...acc, [assetId]: 0 }),
      {}
    )

    let state = createEmptyBalance()
    const result: Balance[] = []
    while (true) {
      const nextDate = nextDateIndex < dates.length ? dates[nextDateIndex] : undefined
      const nextTransaction =
        nextTransactionIndex < transactions.length ? transactions[nextTransactionIndex] : undefined

      if (nextTransaction && (!nextDate || nextTransaction.date <= nextDate)) {
        const benchmarkId = startBenchmark('evaluateBalance.iterate.transaction')
        state = updateBalanceByTransaction(state, nextTransaction)
        nextTransactionIndex = nextTransactionIndex + 1
        endBenchmark(benchmarkId)
      } else if (nextDate) {
        const benchmarkId = startBenchmark('evaluateBalance.iterate.date')
        const nextQuotes = Object.keys(nextQuoteIndexes).reduce<{ [assetId: string]: BigNumber }>((acc, assetId) => {
          const index = nextQuoteIndexes[assetId]
          const nextIndex = findIndexLeftUntil(quotesMap[assetId], q => q.date > nextDate, index)
          if (nextIndex >= 0) {
            nextQuoteIndexes[assetId] = nextIndex
            return {
              ...acc,
              [assetId]: BigNumber(quotesMap[assetId][nextIndex].close),
            }
          } else {
            return acc
          }
        }, {})
        state = updateBalanceDateTime(state, nextDate, '00:00:00')
        state = updateBalanceQuotes(state, nextQuotes)
        result.push(state)
        nextDateIndex = nextDateIndex + 1
        endBenchmark(benchmarkId)
      } else {
        return result
      }
    }
  })
}

export function updateBalanceDateTime(b: Balance, date: string, time: string): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceDateTime', () => {
    return {
      ...b,
      date,
      time,
    }
  })
}

export function updateBalanceQuotes(b: Balance, quotes: { [assetId: string]: BigNumber }): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceQuotes', () => {
    return {
      ...b,
      quotes,
    }
  })
}

export function updateBalanceByTransaction(b: Balance, transaction: Transaction): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransaction', () => {
    if (transaction.date < b.date) {
      throw new Error(`Updating balance must happen in chronological order`)
    }
    if (transaction.date === b.date && transaction.time < b.time) {
      throw new Error(`Updating balance must happen in chronological order`)
    }
    const b2 = updateBalanceDateTime(b, transaction.date, transaction.time)
    switch (transaction.data.type) {
      case 'cashDeposit':
      case 'cashWithdrawal':
        return updateBalanceByTransactionCashDepositWithdrawal(b2, transaction, transaction.data)
      case 'cashTransfer':
        return updateBalanceByTransactionCashTransfer(b2, transaction, transaction.data)
      case 'assetBuy':
        return updateBalanceByTransactionAssetBuy(b2, transaction, transaction.data)
      case 'assetSell':
        return updateBalanceByTransactionAssetSell(b2, transaction, transaction.data)
      case 'assetTransfer':
        return updateBalanceByTransactionAssetTransfer(b2, transaction, transaction.data)
      case 'assetDeposit':
        return updateBalanceByTransactionAssetDeposit(b2, transaction, transaction.data)
      case 'assetWithdrawal':
        return updateBalanceByTransactionAssetWithdrawal(b2, transaction, transaction.data)
      case 'fee':
        return updateBalanceByTransactionFee(b2, transaction, transaction.data)
      case 'tax':
        return updateBalanceByTransactionTax(b2, transaction, transaction.data)
      case 'dividend':
        return updateBalanceByTransactionDividend(b2, transaction, transaction.data)
      case 'interest':
        return updateBalanceByTransactionInterest(b2, transaction, transaction.data)
    }
  })
}

function updateBalanceByTransactionCashDepositWithdrawal(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'cashDeposit' | 'cashWithdrawal' }>
): Balance {
  const negateIfDeposit = (n: BigNumber) => (data.type === 'cashDeposit' ? n.negated() : n)
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionCashDepositWithdrawal', () => {
    return iterate(
      BigNumber(data.cashAmount),
      remainingAmount => !remainingAmount.gt(0),
      b,
      (remainingAmount, b) => {
        const openCashPositionIndex = findIndexLeft(
          b.cashPositions.open,
          p => p.accountId === data.cashAccountId && negateIfDeposit(p.amount).gt(0)
        )
        if (openCashPositionIndex >= 0) {
          const openCashPosition = b.cashPositions.open[openCashPositionIndex]
          const consumedAmount = negateIfDeposit(
            BigNumber.min(negateIfDeposit(openCashPosition.amount), remainingAmount)
          )
          const consumedOpenPrice = BigNumber(openCashPosition.openPrice)
            .multipliedBy(consumedAmount)
            .dividedBy(openCashPosition.amount)
          const openCashPositionUpdated: OpenCashPosition = {
            ...openCashPosition,
            amount: openCashPosition.amount.minus(consumedAmount),
            openPrice: openCashPosition.openPrice.minus(consumedOpenPrice),
          }
          const closePrice = BigNumber(data.cashAmount).multipliedBy(consumedAmount).dividedBy(data.cashAmount)
          const closedCashPositionCreated: ClosedCashPosition = {
            type: 'cash',
            state: 'closed',
            accountId: openCashPosition.accountId,
            amount: consumedAmount,
            openTransactionId: openCashPosition.openTransactionId,
            openDate: openCashPosition.openDate,
            openTime: openCashPosition.openTime,
            openPrice: consumedOpenPrice,
            closeTransactionId: transaction.id,
            closeDate: transaction.date,
            closeTime: transaction.time,
            closePrice: closePrice,
          }
          if (!openCashPositionUpdated.amount.eq(0)) {
            return [
              remainingAmount.minus(negateIfDeposit(consumedAmount)),
              {
                ...b,
                cashPositions: {
                  open: [
                    ...b.cashPositions.open.slice(0, openCashPositionIndex),
                    openCashPositionUpdated,
                    ...b.cashPositions.open.slice(openCashPositionIndex + 1),
                  ],
                  closed: [...b.cashPositions.closed, closedCashPositionCreated],
                },
              },
            ]
          } else {
            return [
              remainingAmount.minus(negateIfDeposit(consumedAmount)),
              {
                ...b,
                cashPositions: {
                  open: [
                    ...b.cashPositions.open.slice(0, openCashPositionIndex),
                    ...b.cashPositions.open.slice(openCashPositionIndex + 1),
                  ],
                  closed: [...b.cashPositions.closed, closedCashPositionCreated],
                },
              },
            ]
          }
        } else {
          return [
            BigNumber(0),
            {
              ...b,
              cashPositions: {
                ...b.cashPositions,
                open: [
                  ...b.cashPositions.open,
                  {
                    type: 'cash',
                    state: 'open',
                    accountId: data.cashAccountId,
                    amount: negateIfDeposit(remainingAmount.negated()),
                    openTransactionId: transaction.id,
                    openDate: transaction.date,
                    openTime: transaction.time,
                    openPrice: negateIfDeposit(remainingAmount.negated()),
                  },
                ],
              },
            },
          ]
        }
      }
    )
  })
}

function updateBalanceByTransactionCashTransfer(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'cashTransfer' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionCashTransfer', () => {
    const b2 = updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashWithdrawal',
      cashAccountId: data.fromCashAccountId,
      cashAmount: data.feeCashAmount,
    })
    const b3 = updateBalanceByTransactionCashDepositWithdrawal(b2, transaction, {
      type: 'cashWithdrawal',
      cashAccountId: data.fromCashAccountId,
      cashAmount: data.cashAmount,
    })
    const closedPositions = b3.cashPositions.closed.slice(b2.cashPositions.closed.length)
    const b4 = {
      ...b3,
      cashPositions: {
        ...b3.cashPositions,
        open: mergeSortedBy(
          b3.cashPositions.open,
          closedPositions.map(p => {
            return {
              type: 'cash',
              state: 'open',
              accountId: data.toCashAccountId,
              amount: p.amount,
              openTransactionId: p.openTransactionId,
              openDate: p.openDate,
              openTime: p.openTime,
              openPrice: p.openPrice,
            } satisfies OpenCashPosition
          }),
          (a, b) => (a.openDate < b.openDate || (a.openDate === b.openDate && a.openTime < b.openTime) ? -1 : 1)
        ),
        closed: b2.cashPositions.closed,
      },
    } satisfies Balance
    return b4
  })
}

function updateBalanceByTransactionAssetDeposit(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetDeposit' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionAssetDeposit', () => {
    return {
      ...b,
      assetPositions: {
        ...b.assetPositions,
        open: [
          ...b.assetPositions.open,
          {
            type: 'asset',
            state: 'open',
            accountId: data.assetAccountId,
            assetId: data.assetId,
            amount: BigNumber(data.assetAmount),
            openTransactionId: transaction.id,
            openDate: transaction.date,
            openTime: transaction.time,
            openPrice: BigNumber(data.cashAmount),
          },
        ],
      },
    }
  })
}

function updateBalanceByTransactionAssetWithdrawal(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetWithdrawal' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionAssetWithdrawal', () => {
    return iterate(
      BigNumber(data.assetAmount),
      remainingAmount => !remainingAmount.gt(0),
      b,
      (remainingAmount, b) => {
        const openAssetPositionIndex = findIndexLeft(
          b.assetPositions.open,
          p => p.accountId === data.assetAccountId && p.assetId === data.assetId
        )
        if (openAssetPositionIndex >= 0) {
          const openAssetPosition = b.assetPositions.open[openAssetPositionIndex]
          const consumedAmount = BigNumber.min(openAssetPosition.amount, remainingAmount)
          const consumedOpenPrice = BigNumber(openAssetPosition.openPrice)
            .multipliedBy(consumedAmount)
            .dividedBy(openAssetPosition.amount)
          const openAssetPositionUpdated: OpenAssetPosition = {
            ...openAssetPosition,
            amount: openAssetPosition.amount.minus(consumedAmount),
            openPrice: openAssetPosition.openPrice.minus(consumedOpenPrice),
          }
          const closePrice = BigNumber(data.cashAmount).multipliedBy(consumedAmount).dividedBy(data.assetAmount)
          const closedCashPositionCreated: ClosedAssetPosition = {
            type: 'asset',
            state: 'closed',
            accountId: openAssetPosition.accountId,
            assetId: openAssetPosition.assetId,
            amount: consumedAmount,
            openTransactionId: openAssetPosition.openTransactionId,
            openDate: openAssetPosition.openDate,
            openTime: openAssetPosition.openTime,
            openPrice: consumedOpenPrice,
            closeTransactionId: transaction.id,
            closeDate: transaction.date,
            closeTime: transaction.time,
            closePrice: closePrice,
          }
          if (!openAssetPositionUpdated.amount.eq(0)) {
            return [
              remainingAmount.minus(consumedAmount),
              {
                ...b,
                assetPositions: {
                  open: [
                    ...b.assetPositions.open.slice(0, openAssetPositionIndex),
                    openAssetPositionUpdated,
                    ...b.assetPositions.open.slice(openAssetPositionIndex + 1),
                  ],
                  closed: [...b.assetPositions.closed, closedCashPositionCreated],
                },
              },
            ]
          } else {
            return [
              remainingAmount.minus(consumedAmount),
              {
                ...b,
                assetPositions: {
                  open: [
                    ...b.assetPositions.open.slice(0, openAssetPositionIndex),
                    ...b.assetPositions.open.slice(openAssetPositionIndex + 1),
                  ],
                  closed: [...b.assetPositions.closed, closedCashPositionCreated],
                },
              },
            ]
          }
        } else {
          return [
            BigNumber(0),
            {
              ...b,
              issues: [
                ...b.issues,
                {
                  type: 'negativeAssetAmounts',
                  transactionId: transaction.id,
                  accountId: data.assetAccountId,
                  assetId: data.assetId,
                  exceededAssetAmount: remainingAmount,
                },
              ],
            },
          ]
        }
      }
    )
  })
}

function updateBalanceByTransactionAssetTransfer(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetTransfer' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionAssetTransfer', () => {
    const b2 = updateBalanceByTransactionAssetWithdrawal(b, transaction, {
      type: 'assetWithdrawal',
      assetAccountId: data.fromAssetAccountId,
      assetId: data.assetId,
      assetAmount: data.feeAssetAmount,
      cashAmount: '0',
    })
    const b3 = updateBalanceByTransactionAssetWithdrawal(b2, transaction, {
      type: 'assetWithdrawal',
      assetAccountId: data.fromAssetAccountId,
      assetId: data.assetId,
      assetAmount: data.assetAmount,
      cashAmount: '0',
    })
    const closedPositions = b3.assetPositions.closed.slice(b2.assetPositions.closed.length)
    const b4 = {
      ...b3,
      assetPositions: {
        ...b3.assetPositions,
        open: mergeSortedBy(
          b3.assetPositions.open,
          closedPositions.map(p => {
            return {
              type: 'asset',
              state: 'open',
              accountId: data.toAssetAccountId,
              assetId: data.assetId,
              amount: p.amount,
              openTransactionId: p.openTransactionId,
              openDate: p.openDate,
              openTime: p.openTime,
              openPrice: p.openPrice,
            } satisfies OpenAssetPosition
          }),
          (a, b) => (a.openDate < b.openDate || (a.openDate === b.openDate && a.openTime < b.openTime) ? -1 : 1)
        ),
        closed: b2.assetPositions.closed,
      },
    } satisfies Balance
    return b4
  })
}

function updateBalanceByTransactionAssetBuy(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetBuy' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionAssetBuy', () => {
    const b2 = updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashWithdrawal',
      cashAccountId: data.cashAccountId,
      cashAmount: BigNumber(data.cashAmount).plus(data.feeCashAmount).toString(),
    })
    const b3 = updateBalanceByTransactionAssetDeposit(b2, transaction, {
      type: 'assetDeposit',
      assetAccountId: data.assetAccountId,
      assetId: data.assetId,
      assetAmount: data.assetAmount,
      cashAmount: data.cashAmount,
    })
    return b3
  })
}

function updateBalanceByTransactionAssetSell(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'assetSell' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionAssetSell', () => {
    const b2 = updateBalanceByTransactionAssetWithdrawal(b, transaction, {
      type: 'assetWithdrawal',
      assetAccountId: data.assetAccountId,
      assetId: data.assetId,
      assetAmount: data.assetAmount,
      cashAmount: data.cashAmount,
    })
    const b3 = updateBalanceByTransactionCashDepositWithdrawal(b2, transaction, {
      type: 'cashDeposit',
      cashAccountId: data.cashAccountId,
      cashAmount: BigNumber(data.cashAmount).minus(data.feeCashAmount).minus(data.taxCashAmount).toString(),
    })
    return b3
  })
}

function updateBalanceByTransactionFee(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'fee' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionFee', () => {
    // TODO must be considered 0 price
    return updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashWithdrawal',
      cashAccountId: data.cashAccountId,
      cashAmount: data.feeCashAmount,
    })
  })
}

function updateBalanceByTransactionTax(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'tax' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionTax', () => {
    // TODO must be considered 0 price
    return updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashWithdrawal',
      cashAccountId: data.cashAccountId,
      cashAmount: data.taxCashAmount,
    })
  })
}

function updateBalanceByTransactionDividend(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'dividend' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionDividend', () => {
    // TODO must be considered 0 price
    return updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashDeposit',
      cashAccountId: data.cashAccountId,
      cashAmount: data.cashAmount,
    })
  })
}

function updateBalanceByTransactionInterest(
  b: Balance,
  transaction: Transaction,
  data: Extract<TransactionData, { type: 'interest' }>
): Balance {
  return wrapBenchmark('evaluateBalance.updateBalanceByTransactionInterest', () => {
    // TODO must be considered 0 price
    return updateBalanceByTransactionCashDepositWithdrawal(b, transaction, {
      type: 'cashDeposit',
      cashAccountId: data.cashAccountId,
      cashAmount: data.cashAmount,
    })
  })
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
