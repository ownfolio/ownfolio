// @vitest-environment node
import BigNumber from 'bignumber.js'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { PdfParserResult } from '../index'
import { testPdfText } from '../testPdf'
import { ingDiBaPdfParser } from './index'

describe('extracts', () => {
  it(
    'buy',
    async () => {
      const text = await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
      await expect(ingDiBaPdfParser(text)).toEqual<PdfParserResult>({
        type: 'assetBuy',
        date: '2023-11-06',
        time: '08:31:32',
        currency: 'EUR',
        asset: ['iShsIII-Core MSCI World U.ETF Registered Shs USD (Acc) o.N.', 'IE00B4L5Y983', 'A0RPWH'],
        assetAmount: BigNumber('20').toString(),
        assetPrice: BigNumber('1538.76').toString(),
        assetAccount: ['1234567890'],
        fee: BigNumber('8.75').toString(),
        account: ['DE12345678901234567890'],
        reference: '11111111.001',
      })
    },
    {
      timeout: 60000,
    }
  )

  it(
    'sell',
    async () => {
      const text = await testPdfText(path.join(__dirname, 'test-sell.pdf'), path.join(__dirname, 'test-sell.txt'))
      await expect(ingDiBaPdfParser(text)).toEqual<PdfParserResult>({
        type: 'assetSell',
        date: '2018-10-23',
        time: '16:38:04',
        currency: 'EUR',
        asset: ['iShsIII-Core MSCI World U.ETF Registered Shs USD (Acc) o.N.', 'IE00B4L5Y983', 'A0RPWH'],
        assetAmount: BigNumber('110').toString(),
        assetPrice: BigNumber('5046.8').toString(),
        assetAccount: ['1234567890'],
        fee: BigNumber('17.52').toString(),
        tax: BigNumber('41.35').toString(),
        account: ['DE12345678901234567890'],
        reference: '11111111.001',
      })
    },
    {
      timeout: 60000,
    }
  )
})
