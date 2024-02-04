import fs from 'fs/promises'

import { pdfToText } from '../../pdf/pdfToText'

export async function testPdfText(pdfFile: string, textFile: string): Promise<string> {
  const pdf = await fs.readFile(pdfFile)
  const text = await pdfToText(pdf)
  await fs.writeFile(textFile, text, 'utf-8')
  return await fs.readFile(textFile, 'utf-8')
}
