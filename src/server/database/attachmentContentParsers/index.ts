import {
  AttachmentContent,
  AttachmentParsedContent,
  AttachmentParsedContentAssetBuySell,
} from '../../../shared/models/Attachment'
import { logger } from '../../logger'
import { pdfToText } from '../../pdf/pdfToText'
import { commerzbankGeschaeftskundenAssetBuySellExtractor } from './commerzbankGeschaeftskunden'
import { ingDiBaAssetBuySellExtractor } from './ingDiBa'

export type AttachmentParsedContentAssetBuySellParser = (text: string) => AttachmentParsedContentAssetBuySell

const allAttachmentParsedContentAssetBuySellParsers: AttachmentParsedContentAssetBuySellParser[] = [
  ingDiBaAssetBuySellExtractor,
  commerzbankGeschaeftskundenAssetBuySellExtractor,
]

export async function extractAttachmentContent(
  mimeType: string,
  buffer: Buffer
): Promise<Omit<AttachmentContent, 'attachmentId'> | null> {
  try {
    switch (mimeType) {
      case 'application/pdf': {
        const text = await pdfToText(buffer)
        const parsed = runAttachmentParsedContentAssetBuySellParser(text)
        return { text, parsed }
      }
      default: {
        return null
      }
    }
  } catch (error) {
    logger.warn('Unable to extract attachment content', { error })
    return null
  }
}

export function runAttachmentParsedContentAssetBuySellParser(text: string): AttachmentParsedContent | null {
  for (let i = 0; i < allAttachmentParsedContentAssetBuySellParsers.length; i++) {
    try {
      return allAttachmentParsedContentAssetBuySellParsers[i](text)
    } catch (err) {
      // ignore
    }
  }
  return null
}
