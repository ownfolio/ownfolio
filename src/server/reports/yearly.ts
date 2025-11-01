import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { rootCurrency } from '../../shared/models/Currency'
import { bigNumberFormat } from '../../shared/utils/bignumber'
import { dateEndOf, dateFormat, dateList, dateParse } from '../../shared/utils/date'
import { evaluateBalance } from '../balance'
import { generatePdf } from '../pdf/generatePdf'
import { type ReportGenerator } from './index'
import { reportStyles } from './shared'

export const yearlyReportParamsSchema = z.object({ type: z.literal('yearly') })

export type YearlyReportParams = z.infer<typeof yearlyReportParamsSchema>

export const generateYearlyReport: ReportGenerator<YearlyReportParams> = async (database, userId) => {
  const transactions = await database.transactions.listByUserId(userId).then(txs => txs.reverse())
  const quotes = await database.quotes.listAllClosesByUserId(userId)
  const now = new Date()
  const dates = dateList(transactions[0] ? dateParse(transactions[0].date) : now, now, 'year')
    .map(d => dateEndOf(d, 'year'))
    .map(date => dateFormat(date, 'yyyy-MM-dd'))
  const balances = evaluateBalance(dates, transactions, { quotes })
  return generatePdf({
    content: [
      { text: 'Yearly report', style: 'h1' },
      {
        style: 'table',
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Year' },
              { text: 'Cash', style: 'amount' },
              { text: 'Assets', style: 'amount' },
              { text: 'Total', style: 'totalAmount' },
            ],
            ...balances.map(result => {
              const cash = result.cashPositions.open.reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
              const assets = result.assetPositions.open.reduce((sum, p) => {
                const quote = result.quotes[p.assetId]
                return sum.plus(quote ? BigNumber(quote).multipliedBy(p.amount) : p.openPrice)
              }, BigNumber(0))
              const total = cash.plus(assets)
              return [
                { text: dateParse(result.date).getFullYear() },
                {
                  text: renderAmountString(cash, 2, rootCurrency.symbol),
                  style: 'amount',
                },
                {
                  text: renderAmountString(assets, 2, rootCurrency.symbol),
                  style: 'amount',
                },
                {
                  text: renderAmountString(total, 2, rootCurrency.symbol),
                  style: 'totalAmount',
                },
              ]
            }),
          ],
        },
      },
    ],
    reportStyles,
  })
}

function renderAmountString(amount: BigNumber, denomination: number, symbol: string): string {
  return bigNumberFormat(amount, denomination) + ' ' + symbol
}
