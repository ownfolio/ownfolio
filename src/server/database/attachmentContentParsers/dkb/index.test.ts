// @vitest-environment node
import path from 'path'
import { describe, it } from 'vitest'

import { testPdfText } from '../testPdf'

describe('extracts', () => {
  it('buy', async () => {
    await testPdfText(path.join(__dirname, 'test-buy.pdf'), path.join(__dirname, 'test-buy.txt'))
  })
})
