import { bench, describe } from 'vitest'

import { Quote } from '../../shared/models/Quote'
import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { dateEndOf, dateFormat, dateList, dateParse, datePlus } from '../../shared/utils/date'
import { evaluateHistoricalAllWithQuotes } from './evaluateAll'

const years = [1, 2, 3, 5, 10]

describe('evaluateHistoricalAllWithQuotes', () => {
  years.forEach(years => {
    const startDate = dateParse('2010-01-01')
    const endDate = dateEndOf(datePlus(startDate, 'year', years - 1), 'year')
    const dates = dateList(startDate, endDate, 'day')
    const transactions: Transaction[] = []
    let date = startDate
    const quotes: Quote[] = []
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
      quotes.push({
        assetId: 'btc',
        date: dateFormat(date, 'yyyy-MM-dd'),
        open: null,
        high: null,
        low: null,
        close: '10',
      })
      date = datePlus(date, 'day', 2)
    }
    bench(`${years} years`, () => {
      evaluateHistoricalAllWithQuotes(transactions, quotes, dates)
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
