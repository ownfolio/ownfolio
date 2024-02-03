// @vitest-environment node
import BigNumber from 'bignumber.js'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { applyAxiosMock, AxiosMock } from '../../../test/axiosMock'
import { euroExchangeRatesAxios, fetchEuroExchangeRates } from './euroExchangeRates'

it(
  'fetchEuroExchangeRates',
  async () => {
    const rates = await fetchEuroExchangeRates()
    expect(rates['2020-01-02']?.USD).toEqual(BigNumber('1.1193'))
    expect(rates['2020-01-02']?.GBP).toEqual(BigNumber('0.84828'))
  },
  {
    timeout: 10000,
  }
)

let euroExchangeRatesAxiosMock: AxiosMock | undefined
beforeAll(async () => {
  euroExchangeRatesAxiosMock = await applyAxiosMock(euroExchangeRatesAxios, __filename.replace(/\.ts$/, '.mock.json'))
})
afterAll(async () => {
  await euroExchangeRatesAxiosMock?.save()
})
