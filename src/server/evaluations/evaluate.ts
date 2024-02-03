import BigNumber from 'bignumber.js'

import { Transaction } from '../../shared/models/Transaction'
import { findIndexLeft, findIndexLeftUntil } from '../../shared/utils/array'
import { dateParse } from '../../shared/utils/date'

export type EvaluationCurrentQuotes = { [assetId: string]: BigNumber | undefined }

export type EvaluationAllQuotes = { [assetId: string]: { date: string; close: BigNumber }[] | undefined }

export type EvaluationStepFunction<T, P> = (
  state: EvaluationResult<T>,
  transaction: Transaction,
  opts: EvaluateOpts<P>
) => EvaluationResult<T>

export interface EvaluationResult<T> {
  value: T
  errors: EvaluationError[]
}

export interface EvaluationResultDated<T> extends EvaluationResult<T> {
  date: string
}

export interface EvaluationError {
  message: string
  transactionId?: string
  accountId?: string
  assetId?: string
}

export interface EvaluateOpts<P> {
  params: P
}

export function evaluateNow<T, P>(
  initial: EvaluationResult<T>,
  transactions: Transaction[],
  fn: EvaluationStepFunction<T, P>,
  opts: EvaluateOpts<P>
): EvaluationResult<T> {
  return transactions.reduce<EvaluationResult<T>>((acc, tx) => fn(acc, tx, opts), initial)
}

export function evaluateHistorical<T, P>(
  initial: EvaluationResult<T>,
  dates: string[],
  transactions: Transaction[],
  fn: EvaluationStepFunction<T, P>,
  opts: EvaluateOpts<P>
): EvaluationResultDated<T>[] {
  const result: EvaluationResultDated<T>[] = []
  let nextTransactionIndex = 0
  let state = initial
  dates.forEach(date => {
    const nextDateTransactionId = findIndexLeft(
      transactions,
      tx => dateParse(tx.date).valueOf() > dateParse(date).valueOf(),
      nextTransactionIndex
    )
    const dateTransactions =
      nextDateTransactionId >= 0
        ? transactions.slice(nextTransactionIndex, nextDateTransactionId)
        : transactions.slice(nextTransactionIndex)
    nextTransactionIndex = nextDateTransactionId >= 0 ? nextDateTransactionId : transactions.length
    state = dateTransactions.reduce((acc, tx) => {
      const result = fn(acc, tx, { ...opts })
      return {
        value: result.value,
        errors: evaluationErrorsDistinct(result.errors),
      }
    }, state)
    result.push({
      date,
      value: state.value,
      errors: state.errors,
    })
  })
  return result
}

export type EvaluationHistoryWithQuotesFunction<T, T2> = (
  history: EvaluationResultDated<T>,
  quotes: EvaluationCurrentQuotes
) => EvaluationResultDated<T2>

export function evaluateHistoricalWithQuotes<T, T2>(
  history: EvaluationResultDated<T>[],
  quotes: EvaluationAllQuotes,
  fn: EvaluationHistoryWithQuotesFunction<T, T2>
): EvaluationResultDated<T2>[] {
  const quotesState = Object.keys(quotes).reduce<{
    [assetId: string]: {
      nextIndex: number
      quotes: { date: string; close: BigNumber }[]
    }
  }>((acc, assetId) => {
    return {
      ...acc,
      [assetId]: {
        nextIndex: 0,
        quotes: quotes[assetId]!,
      },
    }
  }, {})
  const quotesStateKeys = Object.keys(quotesState)
  return history.map(result => {
    const quotes = quotesStateKeys.reduce<EvaluationCurrentQuotes>((acc, assetId) => {
      const nextIndex = findIndexLeftUntil(
        quotesState[assetId].quotes,
        q => dateParse(q.date).valueOf() > dateParse(result.date).valueOf(),
        quotesState[assetId].nextIndex
      )
      if (nextIndex >= 0) {
        quotesState[assetId].nextIndex = nextIndex
        return { ...acc, [assetId]: quotesState[assetId]!.quotes[nextIndex].close }
      }
      return acc
    }, {})
    return fn(result, quotes)
  })
}

export function evaluationErrorsDistinct(errors: EvaluationError[]): EvaluationError[] {
  return errors.reduce<EvaluationError[]>((acc, err) => {
    return !acc.find(
      e =>
        e.message === err.message &&
        e.accountId === err.accountId &&
        e.assetId === err.assetId &&
        e.transactionId === err.transactionId
    )
      ? [...acc, err]
      : acc
  }, [])
}

export function evaluationSumOverAccounts(
  data: Record<string, BigNumber>,
  accountFilter?: (accountId: string) => boolean
): BigNumber {
  return Object.keys(data)
    .filter(accountId => !accountFilter || accountFilter(accountId))
    .reduce((sum, accountId) => sum.plus(data[accountId]), BigNumber(0))
}

export function evaluationSumOverAccountsAndAssets(
  data: Record<string, Record<string, BigNumber>>,
  accountFilter?: (accountId: string) => boolean
): BigNumber {
  return Object.keys(data)
    .filter(accountId => !accountFilter || accountFilter(accountId))
    .reduce((sum, accountId) => {
      return Object.keys(data[accountId]).reduce<BigNumber>((sum, assetId) => sum.plus(data[accountId][assetId]), sum)
    }, BigNumber(0))
}
