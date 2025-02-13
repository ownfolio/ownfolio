import axios from 'axios'
import BigNumber from 'bignumber.js'

type YahooFinanceJsonFormat = {
  chart: {
    result: {
      timestamp: number[]
      indicators: {
        quote: {
          open: number[]
          close: number[]
          high: number[]
          low: number[]
        }[]
      }
    }[]
    error: unknown | null
  }
}

export type YahooFinanceDateResult = { open?: BigNumber; high?: BigNumber; low?: BigNumber; close: BigNumber }
export type YahooFinanceResult = { [date: string]: YahooFinanceDateResult | undefined }

export const yahooFinanceAxios = axios.create()

export async function fetchYahooFinanceQuotes(symbol: string): Promise<YahooFinanceResult> {
  const baseURL = 'https://query1.finance.yahoo.com'

  const resJson = await yahooFinanceAxios.get<YahooFinanceJsonFormat>(`/v8/finance/chart/${symbol}`, {
    baseURL: baseURL,
    params: {
      period1: 0,
      period2: Math.floor(Date.now() / 1000),
      interval: '1d',
      events: 'history',
    },
  })

  const result: YahooFinanceResult = {}
  resJson.data.chart.result[0].timestamp.forEach((ts, idx) => {
    const date = new Date(ts * 1000).toISOString().substring(0, 10)
    const resultLine = {
      open: BigNumber(
        resJson.data.chart.result[0].indicators.quote[0].open[idx] ||
          resJson.data.chart.result[0].indicators.quote[0].close[idx]
      ),
      high: BigNumber(
        resJson.data.chart.result[0].indicators.quote[0].high[idx] ||
          resJson.data.chart.result[0].indicators.quote[0].close[idx]
      ),
      low: BigNumber(
        resJson.data.chart.result[0].indicators.quote[0].low[idx] ||
          resJson.data.chart.result[0].indicators.quote[0].close[idx]
      ),
      close: BigNumber(resJson.data.chart.result[0].indicators.quote[0].close[idx]),
    }
    if (
      BigNumber.isBigNumber(resultLine.open) &&
      resultLine.open.isFinite() &&
      BigNumber.isBigNumber(resultLine.high) &&
      resultLine.high.isFinite() &&
      BigNumber.isBigNumber(resultLine.low) &&
      resultLine.low.isFinite() &&
      BigNumber.isBigNumber(resultLine.close) &&
      resultLine.close.isFinite()
    ) {
      result[date] = resultLine
    }
  })
  return result
}
