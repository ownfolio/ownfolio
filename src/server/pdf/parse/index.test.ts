// @vitest-environment node
import path from 'path'
import { describe, expect, it } from 'vitest'

import { pdfParse } from './index'
import { testPdfText } from './testPdf'

describe('pdfParse', () => {
  it('picks most specific result', async () => {
    const text1 = await testPdfText(
      path.join(__dirname, 'ingDiBa', 'test-buy.pdf'),
      path.join(__dirname, 'ingDiBa', 'test-buy.txt')
    )
    const result1 = await pdfParse(text1)
    expect(result1?.date).toBeDefined()

    const text2 = await testPdfText(
      path.join(__dirname, 'flatex', 'test-buy.pdf'),
      path.join(__dirname, 'flatex', 'test-buy.txt')
    )
    const result2 = await pdfParse(text2)
    expect(result2?.date).toBeDefined()
  }, 60000)
})
