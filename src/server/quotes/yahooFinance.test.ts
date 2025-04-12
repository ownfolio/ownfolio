// @vitest-environment node
import BigNumber from 'bignumber.js'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { applyAxiosMock, AxiosMock } from '../../../test/axiosMock'
import { fetchYahooFinanceQuotes, yahooFinanceAxios } from './yahooFinance'

it('fetchYahooFinanceQuotes', async () => {
  const quotes1 = await fetchYahooFinanceQuotes('EUNL.DE')
  expect(quotes1['2024-01-02']!.close).toEqual(BigNumber('82.21600341796875'))

  const quotes2 = await fetchYahooFinanceQuotes('GERD.DE')
  Object.keys(quotes2).map(date => {
    const quote = quotes2[date]!
    if (quote.open) {
      expect(quote.open.isFinite()).toBe(true)
    }
    if (quote.high) {
      expect(quote.high.isFinite()).toBe(true)
    }
    if (quote.low) {
      expect(quote.low.isFinite()).toBe(true)
    }
    expect(quote.close.isFinite()).toBe(true)
  })
}, 10000)

let yahooFinanceAxiosMock: AxiosMock | undefined
beforeAll(async () => {
  yahooFinanceAxiosMock = await applyAxiosMock(yahooFinanceAxios, __filename.replace(/\.ts$/, '.mock.json'))
})
afterAll(async () => {
  await yahooFinanceAxiosMock?.save()
})
