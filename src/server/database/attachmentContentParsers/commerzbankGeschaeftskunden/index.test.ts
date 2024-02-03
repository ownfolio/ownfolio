import fs from 'fs/promises'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { commerzbankGeschaeftskundenAssetBuySellExtractor } from './index'

describe('extracts', () => {
  it('buy', async () => {
    const text = await fs.readFile(path.join(__dirname, 'test-buy.txt'), 'utf-8')
    await expect(commerzbankGeschaeftskundenAssetBuySellExtractor(text)).toEqual({
      type: 'assetBuy',
      date: '2021-11-29',
      time: '09:34:00',
      currency: 'EUR',
      amount: '128',
      price: '9884.93',
      fee: '',
      tax: '',
      cashAccount: ['DE12345678901234567890'],
      assetAccount: ['1234567890'],
      asset: [],
      reference: '78000941000258500816-001',
    })
  })
})
