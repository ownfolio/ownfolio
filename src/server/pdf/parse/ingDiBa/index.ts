import BigNumber from 'bignumber.js'

import { filterNotUndefined } from '../../../../shared/utils/array'
import { PdfParser, PdfParserResult } from '../index'
import { parseGermanBigNumber, parseGermanDate } from '../utils'

export const ingDiBaPdfParser: PdfParser = (text: string) => {
  const typeMatch = text.match(/Wertpapierabrechnung\s+(Kauf|Verkauf)/)?.slice(1)
  if (!typeMatch) {
    return null
  }

  const dateTimeMatch = text.match(/(\d{2}\.\d{2}\.\d{4})(?: um (\d{2}:\d{2}:\d{2}) Uhr)?/)?.slice(1)
  const assetNameMatch = text.match(/Wertpapierbezeichnung\s+([^\n]+(?:\n[^\n]+)?)/)?.slice(1)
  const assetIdentifiersMatch = text.match(/ISIN(?:\s+\(WKN\))?\s+([^\s]+)(?:\s+\(([^)]+)\))?/)?.slice(1)
  const assetAmountMatch = text.match(/Nominale\s+Stück\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const assetPriceMatch = text.match(/Kurswert\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const assetAccountMatch = text.match(/Direkt-Depot Nr.:\s+([^\n]+)/)?.slice(1)
  const feeMatch = text.match(/Provision\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const tax1Match = text.match(/Kapitalertragsteuer\s+(?:\d+,\d+ %)?\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const tax2Match = text
    .match(/Solidaritätszuschlag\s+(?:\d+,\d+ %)?\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)
    ?.slice(1)
  const accountMatch = text.match(/Abrechnungs-IBAN\s+([^\n]+)/)?.slice(1)
  const referenceMatch = text.match(/Ordernummer\s+(\d+\.\d+)/)?.slice(1)

  return {
    type: typeMatch[0] === 'Kauf' ? 'assetBuy' : 'assetSell',
    date: dateTimeMatch ? parseGermanDate(dateTimeMatch[0]) : undefined,
    time: dateTimeMatch ? dateTimeMatch[1] : undefined,
    currency: assetPriceMatch ? assetPriceMatch[0] : undefined,
    asset: [
      ...(assetNameMatch?.map(s => s.replace(/\n/g, ' ')) || []),
      ...(assetIdentifiersMatch ? filterNotUndefined(assetIdentifiersMatch) : []),
    ],
    assetAmount: assetAmountMatch ? parseGermanBigNumber(assetAmountMatch[0]).toString() : undefined,
    assetPrice: assetPriceMatch ? parseGermanBigNumber(assetPriceMatch[1]).toString() : undefined,
    assetAccount: [...(assetAccountMatch?.map(n => n.trim().replace(/ /g, '')) || [])],
    fee: feeMatch ? parseGermanBigNumber(feeMatch[1]).toString() : undefined,
    tax:
      tax1Match || tax2Match
        ? (tax1Match ? parseGermanBigNumber(tax1Match[1]) : BigNumber(0))
            .plus(tax2Match ? parseGermanBigNumber(tax2Match[1]) : BigNumber(0))
            .toString()
        : undefined,
    account: [...(accountMatch?.map(n => n.trim().replace(/ /g, '')) || [])],
    reference: referenceMatch ? referenceMatch[0] : undefined,
  } as PdfParserResult
}
