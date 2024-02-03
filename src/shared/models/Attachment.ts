import { z } from 'zod'

export const attachmentParsedContentAssetBuySellSchema = z.object({
  type: z.enum(['assetBuy', 'assetSell']),
  date: z.string(),
  time: z.string(),
  currency: z.string(),
  amount: z.string(),
  price: z.string(),
  fee: z.string(),
  tax: z.string(),
  cashAccount: z.array(z.string()),
  assetAccount: z.array(z.string()),
  asset: z.array(z.string()),
  reference: z.string(),
})

export type AttachmentParsedContentAssetBuySell = z.infer<typeof attachmentParsedContentAssetBuySellSchema>

export const attachmentParsedContentSchema = z.discriminatedUnion('type', [attachmentParsedContentAssetBuySellSchema])

export type AttachmentParsedContent = z.infer<typeof attachmentParsedContentSchema>

export const attachmentContentSchema = z.object({
  attachmentId: z.string(),
  text: z.string(),
  parsed: attachmentParsedContentSchema.nullable().default(null),
})

export type AttachmentContent = z.infer<typeof attachmentContentSchema>

export const attachmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fileName: z.string().trim().min(1).max(128),
  mimeType: z.string().trim().min(1).max(128),
  size: z.number(),
  createdAt: z.string().datetime(),
})

export type Attachment = z.infer<typeof attachmentSchema>

export function createEmptyAttachment(): Attachment {
  return {
    id: '',
    userId: '',
    fileName: '',
    mimeType: '',
    size: 0,
    createdAt: '',
  }
}
