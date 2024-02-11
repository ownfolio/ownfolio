import { logger } from '../../logger'
import { commerzbankGeschaeftskundenPdfParser } from './commerzbankGeschaeftskunden'
import { dkbPdfParser } from './dkb'
import { ingDiBaPdfParser } from './ingDiBa'

export type PdfParser = (text: string) => PdfParserResult | null

const allPdfParsers: PdfParser[] = [ingDiBaPdfParser, dkbPdfParser, commerzbankGeschaeftskundenPdfParser]

export type PdfParserResult =
  | {
      type: 'assetBuy'
      date?: string
      time?: string
      currency?: string
      asset?: string[]
      assetAmount?: string
      assetPrice?: string
      assetAccount?: string[]
      fee?: string
      total?: string
      account?: string[]
      reference?: string
    }
  | {
      type: 'assetSell'
      date?: string
      time?: string
      currency?: string
      asset?: string[]
      assetAmount?: string
      assetPrice?: string
      assetAccount?: string[]
      fee?: string
      tax?: string
      total?: string
      account?: string[]
      reference?: string
    }

export function pdfParse(text: string): PdfParserResult | null {
  for (let i = 0; i < allPdfParsers.length; i++) {
    try {
      const result = allPdfParsers[i](text)
      if (result !== null) {
        return result
      }
    } catch (error) {
      logger.warn('Unable to parse PDF', { error })
    }
  }
  return null
}
