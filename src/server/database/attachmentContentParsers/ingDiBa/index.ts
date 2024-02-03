import BigNumber from 'bignumber.js'

import { filterNotUndefined } from '../../../../shared/utils/array'
import { AttachmentParsedContentAssetBuySellParser } from '../index'
import { parseGermanBigNumber, parseGermanDate } from '../utils'

export const ingDiBaAssetBuySellExtractor: AttachmentParsedContentAssetBuySellParser = (text: string) => {
  const typeStr = text.match(/Wertpapierabrechnung\s+(Kauf|Verkauf)/)?.slice(1)
  const dateTimeMatch = text.match(/(\d{2}\.\d{2}\.\d{4})(?: um (\d{2}:\d{2}:\d{2}) Uhr)?/)?.slice(1)
  const amountMatch = text.match(/Nominale\s+Stück\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const priceMatch = text.match(/Kurswert\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const feeMatch = text.match(/Provision\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const tax1Match = text.match(/Kapitalertragsteuer\s+(?:\d+,\d+ %)?\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)?.slice(1)
  const tax2Match = text
    .match(/Solidaritätszuschlag\s+(?:\d+,\d+ %)?\s+([A-Z]{3})\s+((?:\d+\.)*\d+(?:,\d+)?)/)
    ?.slice(1)
  const cashAccountMatch = text.match(/Abrechnungs-IBAN\s+([^\n]+)/)?.slice(1)
  const assetAccountMatch = text.match(/Direkt-Depot Nr.:\s+([^\n]+)/)?.slice(1)
  const assetNameMatch = text.match(/Wertpapierbezeichnung\s+([^\n]+(?:\n[^\n]+)?)/)?.slice(1)
  const assetIdentifiersMatch = text.match(/ISIN(?:\s+\(WKN\))?\s+([^\s]+)(?:\s+\(([^)]+)\))?/)?.slice(1)
  const referenceMatch = text.match(/Ordernummer\s+(\d+\.\d+)/)?.slice(1)

  if (!typeStr) {
    throw new Error('Unable to extract transaction type')
  }
  if (!dateTimeMatch) {
    throw new Error('Unable to extract date')
  }
  if (!amountMatch) {
    throw new Error('Unable to extract asset amount')
  }
  if (!priceMatch) {
    throw new Error('Unable to extract price')
  }

  return {
    type: typeStr[0] === 'Kauf' ? 'assetBuy' : 'assetSell',
    date: parseGermanDate(dateTimeMatch[0]),
    time: dateTimeMatch[1] || '00:00:00',
    currency: priceMatch[0],
    amount: parseGermanBigNumber(amountMatch[0]).toString(),
    price: parseGermanBigNumber(priceMatch[1]).toString(),
    fee: (feeMatch ? parseGermanBigNumber(feeMatch[1]) : BigNumber(0)).toString(),
    tax: (tax1Match ? parseGermanBigNumber(tax1Match[1]) : BigNumber(0))
      .plus(tax2Match ? parseGermanBigNumber(tax2Match[1]) : BigNumber(0))
      .toString(),
    cashAccount: [...(cashAccountMatch?.map(n => n.trim().replace(/ /g, '')) || [])],
    assetAccount: [...(assetAccountMatch?.map(n => n.trim().replace(/ /g, '')) || [])],
    asset: [
      ...(assetNameMatch?.map(s => s.replace(/\n/g, ' ')) || []),
      ...(assetIdentifiersMatch ? filterNotUndefined(assetIdentifiersMatch) : []),
    ],
    reference: referenceMatch?.[0] || '',
  }
}
