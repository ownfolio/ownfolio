import BigNumber from 'bignumber.js'

import { Transaction } from '../../shared/models/Transaction'
import { findIndexLeft, findIndexLeftUntil, uniqueBy } from '../../shared/utils/array'
import { dateParse } from '../../shared/utils/date'

export type EvaluationCurrentQuotes = { [assetId: string]: BigNumber | undefined }

export type EvaluationAllQuotes = { [assetId: string]: { date: string; close: BigNumber }[] | undefined }

export type EvaluationStepFunction<T, E, P> = (
  state: EvaluationResult<T, E>,
  transaction: Transaction,
  opts: EvaluateOpts<P>
) => EvaluationResult<T, E>

export interface EvaluationResult<T, E> {
  value: T
  errors: E[]
}

export interface EvaluationResultDated<T, E> extends EvaluationResult<T, E> {
  date: string
}

export interface EvaluateOpts<P> {
  params: P
}

export function evaluateNow<T, E, P>(
  initial: EvaluationResult<T, E>,
  transactions: Transaction[],
  fn: EvaluationStepFunction<T, E, P>,
  opts: EvaluateOpts<P>
): EvaluationResult<T, E> {
  return transactions.reduce<EvaluationResult<T, E>>((acc, tx) => fn(acc, tx, opts), initial)
}

export function evaluateHistorical<T, E, P>(
  initial: EvaluationResult<T, E>,
  dates: string[],
  transactions: Transaction[],
  fn: EvaluationStepFunction<T, E, P>,
  opts: EvaluateOpts<P>
): EvaluationResultDated<T, E>[] {
  const result: EvaluationResultDated<T, E>[] = []
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
        // TODO use deep equals function instead of comparing JSON.stringify
        errors: uniqueBy(result.errors, e => JSON.stringify(e)),
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

export type EvaluationHistoryWithQuotesFunction<T, E, T2> = (
  history: EvaluationResultDated<T, unknown>,
  quotes: EvaluationCurrentQuotes
) => EvaluationResultDated<T2, E>

export function evaluateHistoricalWithQuotes<T, E, T2>(
  history: EvaluationResultDated<T, unknown>[],
  quotes: EvaluationAllQuotes,
  fn: EvaluationHistoryWithQuotesFunction<T, E, T2>
): EvaluationResultDated<T2, E>[] {
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
