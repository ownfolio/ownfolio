// @vitest-environment node
import path from 'path'
import { describe, expect, it } from 'vitest'

import { testPdfText } from '../testPdf'
import { dkbPdfParser } from './index'

describe('extracts', () => {
  it(
    'buy',
    async () => {
      const text = await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
      await expect(dkbPdfParser(text)).toBeNull()
    },
    {
      timeout: 60000,
    }
  )
})
