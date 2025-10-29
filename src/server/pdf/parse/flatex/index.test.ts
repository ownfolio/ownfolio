// @vitest-environment node
import BigNumber from 'bignumber.js'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { currencies } from '../../../../shared/models/Currency'
import { PdfParserResult } from '../index'
import { testPdfText } from '../testPdf'
import { flatexPdfParser } from './index'

describe('extracts', () => {
  it('buy', async () => {
    const text = await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
    await expect(flatexPdfParser(text)).toEqual<PdfParserResult>({
      type: 'assetBuy',
      date: '2025-03-24',
      time: '07:38:00',
      currency: currencies.EUR.symbol,
      asset: ['ISHARES CORE MSCI WORLD E', 'IE00B4L5Y983', 'A0RPWH'],
      assetAmount: BigNumber('10').toString(),
      assetPrice: BigNumber('998.98').toString(),
      assetAccount: ['1234567890'],
      account: ['0987654321'],
      reference: '111111111/1',
    })
  }, 60000)
})
