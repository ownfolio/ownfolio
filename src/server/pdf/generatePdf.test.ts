// @vitest-environment node
import * as fs from 'fs/promises'
import path from 'path'
import { expect, it } from 'vitest'

import { generatePdf } from './generatePdf'

it('generatePdf', async () => {
  const pdf = await generatePdf({
    content: [
      { text: 'Hello1' },
      { text: 'World1', pageBreak: 'after' },
      { text: 'Hello2' },
      { text: 'World2', pageBreak: 'after' },
      { text: 'Hello3' },
      { text: 'World3' },
    ],
  })
  expect(pdf.length).toBeGreaterThan(0)
  await fs.mkdir(path.join(__dirname, '../../../temp'), { recursive: true })
  await fs.writeFile(path.join(__dirname, '../../../temp/generatePdf.pdf'), pdf)
}, 60000)
