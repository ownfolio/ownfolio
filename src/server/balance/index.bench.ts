import BigNumber from 'bignumber.js'
import { bench, describe } from 'vitest'

import { Quote } from '../../shared/models/Quote'
import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { dateEndOf, dateFormat, dateList, dateParse, datePlus } from '../../shared/utils/date'
import { evaluateBalances } from './index'

const years = [1, 2, 3, 5, 10]

describe('evaluateBalance', () => {
  years.forEach(years => {
    const startDate = dateParse('2010-01-01')
    const endDate = dateEndOf(datePlus(startDate, 'year', years - 1), 'year')
    const quotes: Quote[] = []
    const transactions: Transaction[] = []
    let date = startDate
    while (date.valueOf() <= endDate.valueOf()) {
      const dateStr = dateFormat(date, 'yyyy-MM-dd')
      transactions.push(
        tx(dateStr, dateStr, {
          type: 'assetBuy',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: BigNumber('1'),
          cashAccountId: 'eur',
          cashAmount: BigNumber('1000'),
          feeCashAmount: BigNumber('0'),
        })
      )
      const sellDateStr = dateFormat(datePlus(date, 'day', 1), 'yyyy-MM-dd')
      transactions.push(
        tx(sellDateStr, sellDateStr, {
          type: 'assetSell',
          assetAccountId: 'crypto',
          assetId: 'btc',
          assetAmount: BigNumber('0.5'),
          cashAccountId: 'eur',
          cashAmount: BigNumber('500'),
          feeCashAmount: BigNumber('0'),
          taxCashAmount: BigNumber('0'),
        })
      )
      quotes.push({
        assetId: 'btc',
        date: dateStr,
        open: null,
        high: null,
        low: null,
        close: BigNumber(Math.random() * 100),
      })
      date = datePlus(date, 'day', 2)
    }
    const dates = dateList(startDate, endDate, 'day').map(date => dateFormat(date, 'yyyy-MM-dd'))

    bench(`${years} years`, () => {
      evaluateBalances(dates, transactions, { quotes })
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
