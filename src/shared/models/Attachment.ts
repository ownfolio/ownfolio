import { z } from 'zod'

export const attachmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fileName: z.string().trim().min(1).max(128),
  mimeType: z.string().trim().min(1).max(128),
  size: z.number(),
  createdAt: z.string().datetime(),
})

export type Attachment = z.infer<typeof attachmentSchema>

export const attachmentSearchSchema = z.object({
  transactionId: z.string().optional(),
})

export type AttachmentSearch = z.infer<typeof attachmentSearchSchema>

export const attachmentSearchResultSchema = attachmentSchema.extend({ transactionIds: z.array(z.string()) })

export type AttachmentSearchResult = z.infer<typeof attachmentSearchResultSchema>

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
