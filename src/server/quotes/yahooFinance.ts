import axios from 'axios'
import BigNumber from 'bignumber.js'
import { parse } from 'csv-parse/sync'

type YahooFinanceCsvFormat = {
  Date: string
  Open: string
  High: string
  Low: string
  Close: string
  'Adj Close': string
  Volume: string
}[]

export type YahooFinanceDateResult = { open?: BigNumber; high?: BigNumber; low?: BigNumber; close: BigNumber }
export type YahooFinanceResult = { [date: string]: YahooFinanceDateResult | undefined }

export const yahooFinanceAxios = axios.create()

export async function fetchYahooFinanceQuotes(symbol: string): Promise<YahooFinanceResult> {
  const baseURL = 'https://query1.finance.yahoo.com'

  const resCsv = await yahooFinanceAxios.get<string>(`/v7/finance/download/${symbol}`, {
    baseURL: baseURL,
    params: {
      period1: 0,
      period2: Math.floor(Date.now() / 1000),
      interval: '1d',
      events: 'history',
    },
  })
  const resCsvResult = (await parse(resCsv.data, { delimiter: ',', columns: true })) as YahooFinanceCsvFormat

  const result: YahooFinanceResult = {}
  resCsvResult.forEach(elem => {
    if (elem.Date !== 'null' && elem.Close !== 'null') {
      result[elem.Date] = {
        open: elem.Open !== 'null' ? BigNumber(elem.Open) : undefined,
        high: elem.Open !== 'null' ? BigNumber(elem.High) : undefined,
        low: elem.Open !== 'null' ? BigNumber(elem.Low) : undefined,
        close: BigNumber(elem.Close),
      }
    }
  })
  return result
}
