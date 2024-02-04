// @vitest-environment node
import path from 'path'
import { describe, expect, it } from 'vitest'

import { testPdfText } from '../testPdf'
import { commerzbankGeschaeftskundenAssetBuySellExtractor } from './index'

describe('extracts', () => {
  it('buy', async () => {
    const text = await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
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
      reference: '78111111222222222222-001',
    })
  })
})
