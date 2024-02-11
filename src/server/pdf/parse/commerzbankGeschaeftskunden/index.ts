import { PdfParser, PdfParserResult } from '../index'
import { parseGermanBigNumber, parseGermanDate } from '../utils'

export const commerzbankGeschaeftskundenPdfParser: PdfParser = (text: string) => {
  const typeMatch = text.match(/(W e r t p a p i e r k a u f|W e r t p a p i e r v e r k a u f)/)?.slice(1)
  if (!typeMatch) {
    return null
  }

  const dateMatch = text.match(/G e s c h ä f t s t a g\s+:\s+(\d(?: \d)? \. \d(?: \d)? \. \d \d \d \d)/)?.slice(1)
  const timeMatch = text.match(/H a n d e l s z e i t\s+:\s+(\d \d : \d \d)/m)?.slice(1)
  const assetAmountMatch = text.match(/Nennwert\s+Zum\s+Kurs\s+von\s+S t .\s+([\d\s]*\d)/)?.slice(1)
  const assetPriceMatch = text
    .match(/K u r s w e r t\s+:\s+([A-Z]{3})\s+((?:[\d\s]+\.\s+)*[\d\s]+(?:,[\d\s]*\d)?)/)
    ?.slice(1)
  const assetAccountMatch = text.match(/Depotnr.:\s+([\d\s]+\d)/)?.slice(1)
  const accountMatch = text.match(/(DE(?:[\d\s]*\d))/)?.slice(1)
  const totalMatch = text
    .match(/(?:DE(?:[\d\s]*\d)) EUR (?:[\d\s.]+) EUR\s+((?:[\d\s]+\.\s+)*[\d\s]+(?:,[\d\s]*\d)?)/)
    ?.slice(1)
  const referenceMatch = text.match(/G e s c h ä f t s n u m m e r\s+:\s+([\d\s-]+\d)/)?.slice(1)

  return {
    type: typeMatch[0] === 'W e r t p a p i e r k a u f' ? 'assetBuy' : 'assetSell',
    date: dateMatch ? parseGermanDate(dateMatch[0].replace(/\s/g, '')) : undefined,
    time: timeMatch ? timeMatch[0].replace(/\s/g, '') + ':00' : undefined,
    currency: assetPriceMatch ? assetPriceMatch[0] : undefined,
    asset: [],
    assetAmount: assetAmountMatch ? parseGermanBigNumber(assetAmountMatch[0].replace(/\s/g, '')).toString() : undefined,
    assetPrice: assetPriceMatch ? parseGermanBigNumber(assetPriceMatch[1].replace(/\s/g, '')).toString() : undefined,
    assetAccount: [...(assetAccountMatch?.map(n => n.trim().replace(/\s/g, '')) || [])],
    total: totalMatch ? parseGermanBigNumber(totalMatch[0].replace(/\s/g, '')).toString() : undefined,
    account: [...(accountMatch?.map(n => n.trim().replace(/\s/g, '')) || [])],
    reference: referenceMatch ? referenceMatch[0].replace(/\s/g, '') : undefined,
  } as PdfParserResult
}
