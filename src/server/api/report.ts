import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { bigNumberFormat } from '../../shared/utils/bignumber'
import { dateEndOf, dateFormat, dateList, dateParse } from '../../shared/utils/date'
import { fileSchema, renderDataUrl } from '../../shared/utils/file'
import { Database } from '../database'
import { evaluationSumOverAccounts, evaluationSumOverAccountsAndAssets } from '../evaluations/evaluate'
import { evaluateHistoricalAllWithQuotes } from '../evaluations/evaluateAll'
import { generatePdf } from '../pdf/generatePdf'
import { RpcCtx } from './context'
import { responseSchema } from './utils'

export type { RpcCtx } from './context'

export function createRpcV1Report(database: Database) {
  return {
    generateYearlyPdfReport: createRpcCall(z.void(), responseSchema(fileSchema), async (ctx: RpcCtx) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const transactions = await database.transactions.listByUserId(ctx.user.id).then(txs => txs.reverse())
      const allQuotes = await database.quotes.listAllClosesByUserId(ctx.user.id)
      const now = new Date()
      const dates = dateList(transactions[0] ? dateParse(transactions[0].date) : now, now, 'year').map(d =>
        dateEndOf(d, 'year')
      )
      const allResult = evaluateHistoricalAllWithQuotes(transactions, allQuotes, dates)
      const pdf = await generatePdf({
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
                      text: renderAmountString(evaluationSumOverAccounts(result.value.accountCashHoldings), 2, 'EUR'),
                      style: 'amount',
                    },
                    {
                      text: renderAmountString(
                        evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices),
                        2,
                        'EUR'
                      ),
                      style: 'amount',
                    },
                    {
                      text: renderAmountString(
                        evaluationSumOverAccounts(result.value.accountCashHoldings).plus(
                          evaluationSumOverAccountsAndAssets(result.value.accountAssetCurrentPrices)
                        ),
                        2,
                        'EUR'
                      ),
                      style: 'totalAmount',
                    },
                  ]
                }),
              ],
            },
          },
        ],
        styles,
      })
      const file = {
        fileName: `myfolio-yearly-report-${dateFormat(new Date(), 'yyyyMMdd-HHMMSS')}.pdf`,
        dataUrl: renderDataUrl('application/pdf', pdf.toString('base64')),
      }
      return { data: file }
    }),
  }
}

const styles = {
  h1: {
    fontSize: 18,
    bold: true,
    margin: [0, 0, 0, 10],
  },
  h2: {
    fontSize: 16,
    bold: true,
    margin: [0, 10, 0, 5],
  },
  table: {
    margin: [0, 5, 0, 15],
  },
  amount: {
    font: 'RobotoMono',
    alignment: 'right',
  },
  totalAmount: {
    bold: true,
    font: 'RobotoMono',
    alignment: 'right',
  },
}

function renderAmountString(amount: BigNumber, denomination: number, symbol: string): string {
  return bigNumberFormat(amount, denomination) + ' ' + symbol
}
