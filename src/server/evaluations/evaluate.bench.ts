import BigNumber from 'bignumber.js'
import { bench, describe } from 'vitest'

import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { dateEndOf, dateFormat, dateList, dateParse, datePlus } from '../../shared/utils/date'
import {
  evaluateHistorical,
  evaluateHistoricalWithQuotes,
  EvaluationAllQuotes,
  EvaluationResult,
  EvaluationStepFunction,
} from './evaluate'

const years = [1, 2, 3, 5, 10]
const fn: EvaluationStepFunction<number, { factor: number }> = (acc, _transaction, opts): EvaluationResult<number> => ({
  value: acc.value + opts.params.factor,
  errors: acc.errors,
})

describe('evaluateHistorical', () => {
  years.forEach(years => {
    const startDate = dateParse('2010-01-01')
    const endDate = dateEndOf(datePlus(startDate, 'year', years - 1), 'year')
    const dates = dateList(startDate, endDate, 'day')
    const transactions: Transaction[] = []
    let date = startDate
    while (date.valueOf() <= endDate.valueOf()) {
      const dateStr = dateFormat(date, 'yyyy-MM-dd')
      transactions.push(
        tx(dateStr, dateStr, {
          type: 'assetBuy',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: '1',
          cashAccountId: 'eur',
          cashAmount: '1000',
          feeCashAmount: '0',
        })
      )
      const sellDateStr = dateFormat(datePlus(date, 'day', 1), 'yyyy-MM-dd')
      transactions.push(
        tx(sellDateStr, sellDateStr, {
          type: 'assetSell',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: '0.5',
          cashAccountId: 'eur',
          cashAmount: '500',
          feeCashAmount: '0',
          taxCashAmount: '0',
        })
      )
      date = datePlus(date, 'day', 2)
    }

    bench(`${years} years`, () => {
      evaluateHistorical(
        { value: 0, errors: [] },
        dates.map(d => dateFormat(d, 'yyyy-MM-dd')),
        transactions,
        fn,
        { params: { factor: 1 } }
      )
    })
  })
})

describe('evaluateHistoricalWithQuotes', () => {
  years.forEach(years => {
    const startDate = dateParse('2010-01-01')
    const endDate = dateEndOf(datePlus(startDate, 'year', years - 1), 'year')
    const dates = dateList(startDate, endDate, 'day')
    const transactions: Transaction[] = []
    let date = startDate
    const quotes: EvaluationAllQuotes = { btc: [] }
    while (date.valueOf() <= endDate.valueOf()) {
      const dateStr = dateFormat(date, 'yyyy-MM-dd')
      transactions.push(
        tx(dateStr, dateStr, {
          type: 'assetBuy',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: '1',
          cashAccountId: 'eur',
          cashAmount: '1000',
          feeCashAmount: '0',
        })
      )
      const sellDateStr = dateFormat(datePlus(date, 'day', 1), 'yyyy-MM-dd')
      transactions.push(
        tx(sellDateStr, sellDateStr, {
          type: 'assetSell',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: '0.5',
          cashAccountId: 'eur',
          cashAmount: '500',
          feeCashAmount: '0',
          taxCashAmount: '0',
        })
      )
      quotes.btc!.push({ date: dateFormat(date, 'yyyy-MM-dd'), close: BigNumber(10) })
      date = datePlus(date, 'day', 2)
    }
    const history = evaluateHistorical(
      { value: 0, errors: [] },
      dates.map(d => dateFormat(d, 'yyyy-MM-dd')),
      transactions,
      fn,
      { params: { factor: 1 } }
    )
    bench(`${years} years`, () => {
      evaluateHistoricalWithQuotes(history, quotes, res => res)
    })
  })
})

function tx(id: string, date: string, data: TransactionData): Transaction {
  return {
    id,
    userId: '',
    date,
    time: '00:00:00',
    data,
    reference: '',
    comment: '',
    createdAt: '',
  }
}
