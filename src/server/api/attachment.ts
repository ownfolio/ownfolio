import { createRpcCall, RpcError } from '@choffmeister/rpc-core'
import { z } from 'zod'

import { attachmentContentSchema, attachmentSchema, attachmentSearchSchema } from '../../shared/models/Attachment'
import { fileSchema, parseDataUrl, renderDataUrl } from '../../shared/utils/file'
import { Database } from '../database'
import { pdfToConcatenatedPngs, splitConcatenatedPngs } from '../pdf/pdfToPngs'
import { RpcCtx } from './context'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from './utils'

export function createRpcV1Attachment(database: Database) {
  return {
    listAttachments: createRpcCall(
      attachmentSearchSchema.extend(pagingParamsSchema.shape),
      listResponseSchema(attachmentSchema.extend({ transactionCount: z.number() })),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const attachments = await database.attachments.listByUserId(ctx.user.id, input, input.skip, input.top)
        return { data: attachments }
      }
    ),
    retrieveAttachment: createRpcCall(byIdSchema, responseSchema(attachmentSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      return { data: attachment }
    }),
    linkAttachmentToTransaction: createRpcCall(
      byIdSchema.extend({ transactionId: z.string() }),
      responseSchema(z.void()),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await database.attachments.linkToTransaction(input.id, input.transactionId)
        return {}
      }
    ),
    unlinkAttachmentFromTransaction: createRpcCall(
      byIdSchema.extend({ transactionId: z.string() }),
      responseSchema(z.void()),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await database.attachments.unlinkFromTransaction(input.id, input.transactionId)
        return {}
      }
    ),
    deleteAttachment: createRpcCall(byIdSchema, responseSchema(z.void()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      await database.attachments.delete(input.id)
      return {}
    }),
    uploadAttachment: createRpcCall(fileSchema, responseSchema(attachmentSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const { fileName } = input
      const [mimeType, bytesBase64] = parseDataUrl(input.dataUrl)
      if (mimeType !== 'application/pdf') {
        throw RpcError.badRequest('Only accepts PDFs')
      }
      const attachment = await database.attachments.createAndWrite(
        ctx.user.id,
        fileName,
        mimeType,
        Buffer.from(bytesBase64, 'base64')
      )
      return { data: attachment }
    }),
    downloadAttachment: createRpcCall(byIdSchema, responseSchema(fileSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      const bytes = await database.attachments.read(input.id)
      return {
        data: { fileName: attachment.fileName, dataUrl: renderDataUrl(attachment.mimeType, bytes.toString('base64')) },
      }
    }),
    downloadAttachmentAsPng: createRpcCall(byIdSchema, listResponseSchema(z.string()), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      if (attachment.mimeType !== 'application/pdf') {
        throw RpcError.conflict(`Only PDF attachments can be download as PNG`)
      }
      const pngsBytes = await database.attachments.readDerivation(
        input.id,
        'pdfToConcatenatedPngs',
        30 * 24 * 60 * 60 * 1000,
        pdfToConcatenatedPngs
      )
      return {
        data: splitConcatenatedPngs(pngsBytes).map(pngBytes => renderDataUrl('image/png', pngBytes.toString('base64'))),
      }
    }),
    retrieveAttachmentContent: createRpcCall(
      byIdSchema,
      responseSchema(attachmentContentSchema.nullable()),
      async (ctx: RpcCtx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const attachment = await database.attachments.find(input.id)
        if (!attachment || attachment.userId !== ctx.user.id)
          throw RpcError.badRequest(`Unknown attachment ${input.id}`)
        const content = await database.attachments.content(input.id)
        return { data: content }
      }
    ),
  }
}
