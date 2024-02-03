// @vitest-environment node
import * as fs from 'fs/promises'
import path from 'path'
import { expect, it } from 'vitest'

import { pdfToPng } from './pdfToPng'

it(
  'pdfToPng',
  async () => {
    const pdf = await fs.readFile(path.join(__dirname, './test.pdf'))
    const pngs = await pdfToPng(pdf)
    expect(pngs).toHaveLength(3)
    await fs.mkdir(path.join(__dirname, '../../../temp'), { recursive: true })
    await Promise.all(
      pngs.map((png, idx) => fs.writeFile(path.join(__dirname, `../../../temp/pdfToPng-${idx + 1}.png`), png))
    )
  },
  {
    timeout: 60000,
  }
)
