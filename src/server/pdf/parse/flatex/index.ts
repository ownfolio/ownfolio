import { filterNotUndefined } from '../../../../shared/utils/array'
import { PdfParser, PdfParserResult } from '../index'
import { parseGermanBigNumber, parseGermanDate } from '../utils'

export const flatexPdfParser: PdfParser = (text: string) => {
  const typeMatch = text.match(/Wertpapierabrechnung\s+(Kauf|Verkauf)/)?.slice(1)
  if (!typeMatch) {
    return null
  }

  const dateMatch = text.match(/Auftragsdatum (\d{2}\.\d{2}\.\d{4})/)?.slice(1)
  const timeMatch = text.match(/Ausführungszeit (\d{2}:\d{2}) Uhr/)?.slice(1)
  const assetNameMatch = text.match(/Nr\.(?:\d+\/\d+)\s+(?:Kauf|Verkauf)\s+([^()]+)/)?.slice(1)
  const assetIdentifiersMatch = text
    .match(/Nr\.(?:\d+\/\d+)\s+(?:Kauf|Verkauf)\s+(?:[^()]+)\s+\(([^()/]+)\/([^()/]+)\)/)
    ?.slice(1)
  const assetAmountMatch = text.match(/Ausgeführt\s+:\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const assetPriceMatch = text.match(/Kurswert\s+:\s+((?:\d+\.)*\d+(?:,\d+)?)\s+([A-Z]{3})/)?.slice(1)
  const assetAccountMatch = text.match(/Ihre Depotnummer:\s+([^\n]+)/)?.slice(1)
  const accountMatch = text.match(/Ihr Konto Nr.:\s+([^\n]+)/)?.slice(1)
  const referenceMatch = text.match(/Nr\.(\d+\/\d+)/)?.slice(1)

  return {
    type: typeMatch[0] === 'Kauf' ? 'assetBuy' : 'assetSell',
    date: dateMatch ? parseGermanDate(dateMatch[0]) : undefined,
    time: timeMatch ? timeMatch[0] + ':00' : undefined,
    currency: assetPriceMatch ? assetPriceMatch[1] : undefined,
    asset: [
      ...(assetNameMatch?.map(s => s.trim()) || []),
      ...(assetIdentifiersMatch ? filterNotUndefined(assetIdentifiersMatch) : []),
    ],
    assetAmount: assetAmountMatch ? parseGermanBigNumber(assetAmountMatch[0]).toString() : undefined,
    assetPrice: assetPriceMatch ? parseGermanBigNumber(assetPriceMatch[0]).toString() : undefined,
    assetAccount: [...(assetAccountMatch?.map(n => n.trim()) || [])],
    account: [...(accountMatch?.map(n => n.trim()) || [])],
    reference: referenceMatch ? referenceMatch[0] : undefined,
  } as PdfParserResult
}
