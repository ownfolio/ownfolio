// @vitest-environment node
import BigNumber from 'bignumber.js'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { PdfParserResult } from '../index'
import { testPdfText } from '../testPdf'
import { commerzbankGeschaeftskundenPdfParser } from './index'

describe('extracts', () => {
  it(
    'buy',
    async () => {
      const text = await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
      await expect(commerzbankGeschaeftskundenPdfParser(text)).toEqual<PdfParserResult>({
        type: 'assetBuy',
        date: '2021-11-29',
        time: '09:34:00',
        currency: 'EUR',
        asset: [],
        assetAmount: BigNumber('128').toString(),
        assetPrice: BigNumber('9884.93').toString(),
        assetAccount: ['1234567890'],
        total: BigNumber('9916.52').toString(),
        account: ['DE12345678901234567890'],
        reference: '78111111222222222222-001',
      })
    },
    {
      timeout: 60000,
    }
  )
})
