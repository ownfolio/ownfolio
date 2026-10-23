import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1AttachmentDefinition } from '../../shared/api/attachment'
import { parseDataUrl, renderDataUrl } from '../../shared/utils/file'
import { Config } from '../config'
import { Database } from '../database'
import { PdfParserResult } from '../pdf/parse'
import { pdfToConcatenatedPngs, splitConcatenatedPngs } from '../pdf/pdfToPngs'
import { pdfToText } from '../pdf/pdfToText'
import { isPdf } from '../pdf/utils'
import { attachmentUploadPath } from './attachmentUpload'
import { RpcCtx } from './context'

export function createRpcV1Attachment(database: Database, config: Config) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1AttachmentDefinition>(rpcV1AttachmentDefinition, {
    listAttachments: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachments = await database.attachments.listByUserId(ctx.user.id, input, input.skip, input.top)
      return { data: attachments }
    },
    retrieveAttachment: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      return { data: attachment }
    },
    retrieveAttachmentContent: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      const parsed = await database.attachments
        .readDerivationIfExists(input.id, 'pdfParse')
        .then(buf => (buf ? (JSON.parse(buf.toString('utf-8')) as PdfParserResult) : null))
      return {
        data: {
          parsed,
        },
      }
    },
    linkAttachmentToTransaction: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      const transaction = await database.transactions.find(input.transactionId)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.transactionId}`)
      await database.attachments.linkToTransaction(input.id, input.transactionId)
      return { data: undefined }
    },
    unlinkAttachmentFromTransaction: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      const transaction = await database.transactions.find(input.transactionId)
      if (!transaction || transaction.userId !== ctx.user.id)
        throw RpcError.badRequest(`Unknown transaction ${input.transactionId}`)
      await database.attachments.unlinkFromTransaction(input.id, input.transactionId)
      return { data: undefined }
    },
    deleteAttachment: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      await database.attachments.delete(input.id)
      return { data: undefined }
    },
    uploadAttachment: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const { fileName } = input
      const [mimeType, bytesBase64] = parseDataUrl(input.dataUrl)
      const bytes = Buffer.from(bytesBase64, 'base64')
      if (mimeType !== 'application/pdf' || !isPdf(bytes)) {
        throw RpcError.badRequest('Only accepts PDFs')
      }
      const attachment = await database.attachments.createAndWrite(ctx.user.id, fileName, mimeType, bytes)
      return { data: attachment }
    },
    createAttachmentUploadUrl: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const { token, expiresAt } = await database.attachments.createUploadToken(ctx.user.id, input.fileName)
      const uploadUrl = config.publicUrl + attachmentUploadPath
      const curlCommand = [
        'curl --fail-with-body -X POST',
        `-H 'Authorization: Bearer ${token}'`,
        `-H 'Content-Type: application/pdf'`,
        `--data-binary @/path/to/file.pdf`,
        `'${uploadUrl}'`,
      ].join(' ')
      return { data: { uploadUrl, token, expiresAt, curlCommand } }
    },
    downloadAttachment: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      const bytes = await database.attachments.read(input.id)
      return {
        data: { fileName: attachment.fileName, dataUrl: renderDataUrl(attachment.mimeType, bytes.toString('base64')) },
      }
    },
    downloadPdfAttachmentAsPngs: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      if (attachment.mimeType !== 'application/pdf') {
        throw RpcError.conflict(`Only PDF attachments can be download as PNG`)
      }
      const pngsBytes = await database.attachments.readDerivation(input.id, 'pdfToConcatenatedPngs', 'image/png', pdf =>
        pdfToConcatenatedPngs(pdf)
      )
      return {
        data: splitConcatenatedPngs(pngsBytes).map(pngBytes => renderDataUrl('image/png', pngBytes.toString('base64'))),
      }
    },
    downloadPdfAttachmentAsText: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const attachment = await database.attachments.find(input.id)
      if (!attachment || attachment.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown attachment ${input.id}`)
      if (attachment.mimeType !== 'application/pdf') {
        throw RpcError.conflict(`Only PDF attachments can be download as text`)
      }
      const textBytes = await database.attachments.readDerivation(input.id, 'pdfToTextRaw', 'text/plain', pdf =>
        pdfToText(pdf).then(str => Buffer.from(str, 'utf-8'))
      )
      return {
        data: textBytes.toString('utf-8'),
      }
    },
  })
}
