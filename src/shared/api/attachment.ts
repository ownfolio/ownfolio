import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { attachmentSchema, attachmentSearchSchema } from '../models/Attachment'
import { fileSchema } from '../utils/file'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1AttachmentDefinition = {
  listAttachments: createRpcCallDefinition(
    attachmentSearchSchema.extend(pagingParamsSchema.shape),
    listResponseSchema(attachmentSchema.extend({ transactionIds: z.array(z.string()) }))
  ),
  retrieveAttachment: createRpcCallDefinition(byIdSchema, responseSchema(attachmentSchema)),
  retrieveAttachmentContent: createRpcCallDefinition(
    byIdSchema,
    responseSchema(z.object({ parsed: z.any().nullable() }))
  ),
  linkAttachmentToTransaction: createRpcCallDefinition(
    byIdSchema.extend({ transactionId: z.string() }),
    responseSchema(z.void())
  ),
  unlinkAttachmentFromTransaction: createRpcCallDefinition(
    byIdSchema.extend({ transactionId: z.string() }),
    responseSchema(z.void())
  ),
  deleteAttachment: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),
  uploadAttachment: createRpcCallDefinition(fileSchema, responseSchema(attachmentSchema)),
  downloadAttachment: createRpcCallDefinition(byIdSchema, responseSchema(fileSchema)),
  downloadPdfAttachmentAsPngs: createRpcCallDefinition(byIdSchema, listResponseSchema(z.string())),
  downloadPdfAttachmentAsText: createRpcCallDefinition(byIdSchema, responseSchema(z.string())),
}
