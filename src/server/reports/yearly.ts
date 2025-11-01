import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { rootCurrency } from '../../shared/models/Currency'
import { bigNumberFormat } from '../../shared/utils/bignumber'
import { dateEndOf, dateList, dateParse } from '../../shared/utils/date'
import { evaluationSumOverAccounts, evaluationSumOverAccountsAndAssets } from '../evaluations/evaluate'
import { evaluateHistoricalAllWithQuotes } from '../evaluations/evaluateAll'
import { generatePdf } from '../pdf/generatePdf'
import { type ReportGenerator } from './index'
import { reportStyles } from './shared'

export const yearlyReportParamsSchema = z.object({ type: z.literal('yearly') })

export type YearlyReportParams = z.infer<typeof yearlyReportParamsSchema>

export const generateYearlyReport: ReportGenerator<YearlyReportParams> = async (database, userId) => {
  const transactions = await database.transactions.listByUserId(userId).then(txs => txs.reverse())
  const allQuotes = await database.quotes.listAllClosesByUserId(userId)
  const now = new Date()
  const dates = dateList(transactions[0] ? dateParse(transactions[0].date) : now, now, 'year').map(d =>
    dateEndOf(d, 'year')
  )
  const allResult = evaluateHistoricalAllWithQuotes(transactions, allQuotes, dates)
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
            ...allResult.map(result => {
              return [
                { text: dateParse(result.date).getFullYear() },
                {
                  text: renderAmountString(
                    evaluationSumOverAccounts(result.value.accountCashHoldings),
                    2,
                    rootCurrency.symbol
                  ),
                  style: 'amount',
                },
                {
                  text: renderAmountString(
                    evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices),
                    2,
                    rootCurrency.symbol
                  ),
                  style: 'amount',
                },
                {
                  text: renderAmountString(
                    evaluationSumOverAccounts(result.value.accountCashHoldings).plus(
                      evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices)
                    ),
                    2,
                    rootCurrency.symbol
                  ),
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
