import { AttachmentParsedContentAssetBuySellParser } from '../index'
import { parseGermanBigNumber, parseGermanDate } from '../utils'

export const commerzbankGeschaeftskundenAssetBuySellExtractor: AttachmentParsedContentAssetBuySellParser = (
  text: string
) => {
  const typeStr = text.match(/(W e r t p a p i e r k a u f|W e r t p a p i e r v e r k a u f)/)?.slice(1)
  const dateMatch = text.match(/G e s c h ä f t s t a g\s+:\s+(\d(?: \d)? \. \d(?: \d)? \. \d \d \d \d)/)?.slice(1)
  const timeMatch = text.match(/H a n d e l s z e i t\s+:\s+(\d \d : \d \d)/m)?.slice(1)
  const amountMatch = text.match(/Nennwert\s+Zum\s+Kurs\s+von\s+S t .\s+([\d\s]*\d)/)?.slice(1)
  const priceMatch = text
    .match(/K u r s w e r t\s+:\s+([A-Z]{3})\s+((?:[\d\s]+\.\s+)*[\d\s]+(?:,[\d\s]*\d)?)/)
    ?.slice(1)
  const cashAccountMatch = text.match(/(DE(?:[\d\s]*\d))/)?.slice(1)
  const assetAccountMatch = text.match(/Depotnr.:\s+([\d\s]+\d)/)?.slice(1)
  const referenceMatch = text.match(/G e s c h ä f t s n u m m e r\s+:\s+([\d\s-]+\d)/)?.slice(1)

  if (!typeStr) {
    throw new Error('Unable to extract transaction type')
  }
  if (!dateMatch) {
    throw new Error('Unable to extract date')
  }
  if (!amountMatch) {
    throw new Error('Unable to extract asset amount')
  }
  if (!priceMatch) {
    throw new Error('Unable to extract currency')
  }

  return {
    type: typeStr[0] === 'W e r t p a p i e r k a u f' ? 'assetBuy' : 'assetSell',
    date: parseGermanDate(dateMatch[0].replace(/\s/g, '')),
    time: timeMatch ? timeMatch[0].replace(/\s/g, '') + ':00' : '00:00:00',
    currency: priceMatch[0],
    amount: parseGermanBigNumber(amountMatch[0].replace(/\s/g, '')).toString(),
    price: parseGermanBigNumber(priceMatch[1].replace(/\s/g, '')).toString(),
    fee: '',
    tax: '',
    cashAccount: [...(cashAccountMatch?.map(n => n.trim().replace(/\s/g, '')) || [])],
    assetAccount: [...(assetAccountMatch?.map(n => n.trim().replace(/\s/g, '')) || [])],
    asset: [],
    reference: referenceMatch ? referenceMatch[0].replace(/\s/g, '') : '',
  }
}
