import fs from 'fs/promises'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { dkbAssetBuySellExtractor } from './index'

describe.skip('extracts', () => {
  it('buy', async () => {
    const text = await fs.readFile(path.join(__dirname, 'test-buy.txt'), 'utf-8')
    await expect(dkbAssetBuySellExtractor(text)).toEqual({})
  })
})
