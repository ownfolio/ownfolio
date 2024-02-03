// @vitest-environment node
import * as fs from 'fs/promises'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { ingDiBaAssetBuySellExtractor } from './index'

describe('extracts', () => {
  it('buy', async () => {
    const text = await fs.readFile(path.join(__dirname, 'test-buy.txt'), 'utf-8')
    await expect(ingDiBaAssetBuySellExtractor(text)).toEqual({
      type: 'assetBuy',
      date: '2023-11-06',
      time: '08:31:32',
      currency: 'EUR',
      amount: '20',
      price: '1538.76',
      fee: '8.75',
      tax: '0',
      cashAccount: ['DE12345678901234567890'],
      assetAccount: ['1234567890'],
      asset: ['iShsIII-Core MSCI World U.ETF Registered Shs USD (Acc) o.N.', 'IE00B4L5Y983', 'A0RPWH'],
      reference: '314419910.001',
    })
  })

  it('sell', async () => {
    const text = await fs.readFile(path.join(__dirname, 'test-sell.txt'), 'utf-8')
    await expect(ingDiBaAssetBuySellExtractor(text)).toEqual({
      type: 'assetSell',
      date: '2018-10-23',
      time: '16:38:04',
      currency: 'EUR',
      amount: '110',
      price: '5046.8',
      fee: '17.52',
      tax: '41.35',
      cashAccount: ['DE12345678901234567890'],
      assetAccount: ['1234567890'],
      asset: ['iShsIII-Core MSCI World U.ETF Registered Shs USD (Acc) o.N.', 'IE00B4L5Y983', 'A0RPWH'],
      reference: '134681565.001',
    })
  })
})
