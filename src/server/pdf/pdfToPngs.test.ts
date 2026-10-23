// @vitest-environment node
import * as fs from 'fs/promises'
import path from 'path'
import { expect, it } from 'vitest'

import { pdfToPngs } from './pdfToPngs'

it('pdfToPngs', async () => {
  const pdf = await fs.readFile(path.join(__dirname, './test.pdf'))
  const pngs = await pdfToPngs(pdf)
  expect(pngs).toHaveLength(3)
  await fs.mkdir(path.join(__dirname, '../../../temp'), { recursive: true })
  await Promise.all(
    pngs.map((png, idx) => fs.writeFile(path.join(__dirname, `../../../temp/pdfToPng-${idx + 1}.png`), png))
  )
}, 60000)

it('pdfToPngs does not render other formats', async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="60">' +
      '<image xlink:href="text:/etc/hostname" width="400" height="60"/></svg>'
  )
  await expect(pdfToPngs(svg)).rejects.toThrow()
}, 60000)
