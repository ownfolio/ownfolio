// @vitest-environment node
import * as fs from 'fs/promises'
import path from 'path'
import { expect, it } from 'vitest'

import { pdfToText } from './pdfToText'

it('pdfToText', async () => {
  const pdf = await fs.readFile(path.join(__dirname, './test.pdf'))
  const text = await pdfToText(pdf)
  expect(text).toBe('Hello1\nWorld1\n\fHello2\nWorld2\n\fHello3\nWorld3\n\f')
  await fs.mkdir(path.join(__dirname, '../../../temp'), { recursive: true })
  await fs.writeFile(path.join(__dirname, '../../../temp/pdfToText.txt'), text)
}, 60000)
