// @vitest-environment node
import BigNumber from 'bignumber.js'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { applyAxiosMock, AxiosMock } from '../../../test/axiosMock'
import { fetchYahooFinanceQuotes, yahooFinanceAxios } from './yahooFinance'

it(
  'fetchYahooFinanceQuotes',
  async () => {
    const quotes = await fetchYahooFinanceQuotes('EUNL.DE')
    expect(quotes['2024-01-02']!.close).toEqual(BigNumber('82.21600341796875'))
  },
  {
    timeout: 10000,
  }
)

let yahooFinanceAxiosMock: AxiosMock | undefined
beforeAll(async () => {
  yahooFinanceAxiosMock = await applyAxiosMock(yahooFinanceAxios, __filename.replace(/\.ts$/, '.mock.json'))
})
afterAll(async () => {
  await yahooFinanceAxiosMock?.save()
})
