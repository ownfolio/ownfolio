import { AttachmentParsed } from '../../../shared/models/Attachment'
import { selectionSortBy } from '../../../shared/utils/array'
import { logger } from '../../logger'
import { dkbPdfParser } from './dkb'
import { flatexPdfParser } from './flatex'
import { ingDiBaPdfParser } from './ingDiBa'

export type PdfParser = (text: string) => PdfParserResult | null

const allPdfParsers: PdfParser[] = [dkbPdfParser, flatexPdfParser, ingDiBaPdfParser]

export type PdfParserResult = AttachmentParsed

export function pdfParse(text: string): PdfParserResult | null {
  const results: PdfParserResult[] = []
  for (let i = 0; i < allPdfParsers.length; i++) {
    try {
      const result = allPdfParsers[i](text)
      if (result !== null) {
        results.push(result)
      }
    } catch (error) {
      logger.warn('Unable to parse PDF', { error })
    }
  }
  const sortedResults = selectionSortBy(results, (a, b) => countNonFalsyProperties(b) - countNonFalsyProperties(a))
  return sortedResults[0] || null
}

function countNonFalsyProperties(rec: Record<string, unknown>): number {
  return Object.keys(rec).reduce((count, key) => (rec[key] ? count + 1 : count), 0)
}
