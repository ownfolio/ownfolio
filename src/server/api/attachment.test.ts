// @vitest-environment node
import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { renderDataUrl } from '../../shared/utils/file'
import { databaseTest } from '../database/databaseTest'
import { createRpcV1Attachment } from './attachment'

describe('attachment', () => {
  it(
    'links and unlinks only attachments and transactions of the user',
    databaseTest(async db => {
      await db.init()
      const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
      const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
      const api = createRpcV1Attachment(db, {
        httpPort: 0,
        publicUrl: 'http://localhost',
        userRegistrationEnabled: false,
        trustProxyHops: 0,
        publicDirectory: '',
      })
      const ctx1 = { user: u1, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const ctx2 = { user: u2, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const createTransaction = async (userId: string) => {
        const port = await db.portfolios.create({ userId, name: 'Portfolio', status: 'active' })
        const act = await db.accounts.create({
          portfolioId: port.id,
          name: 'Account',
          number: '',
          currency: currencies.EUR.symbol,
          status: 'active',
        })
        return db.transactions.create({
          userId,
          date: '2020-01-01',
          time: '00:00:00',
          data: { type: 'cashDeposit', cashAccountId: act.id, cashAmount: BigNumber(100) },
          reference: '',
          comment: '',
        })
      }
      const tx1 = await createTransaction(u1.id)
      const tx2 = await createTransaction(u2.id)
      const att1 = await db.attachments.createAndWrite(u1.id, 'a.pdf', 'application/pdf', Buffer.from('a'))
      const att2 = await db.attachments.createAndWrite(u2.id, 'b.pdf', 'application/pdf', Buffer.from('b'))

      await expect(
        api.linkAttachmentToTransaction.handler(ctx1, { id: att2.id, transactionId: tx1.id })
      ).rejects.toThrow(`Unknown attachment ${att2.id}`)
      await expect(
        api.linkAttachmentToTransaction.handler(ctx1, { id: att1.id, transactionId: tx2.id })
      ).rejects.toThrow(`Unknown transaction ${tx2.id}`)
      await expect(db.attachments.listByUserId(u1.id)).resolves.toMatchObject([{ id: att1.id, transactionIds: [] }])
      await expect(db.attachments.listByUserId(u2.id)).resolves.toMatchObject([{ id: att2.id, transactionIds: [] }])

      await api.linkAttachmentToTransaction.handler(ctx2, { id: att2.id, transactionId: tx2.id })
      await expect(
        api.unlinkAttachmentFromTransaction.handler(ctx1, { id: att2.id, transactionId: tx2.id })
      ).rejects.toThrow(`Unknown attachment ${att2.id}`)
      await expect(db.attachments.listByUserId(u2.id)).resolves.toMatchObject([{ transactionIds: [tx2.id] }])

      await api.linkAttachmentToTransaction.handler(ctx1, { id: att1.id, transactionId: tx1.id })
      await expect(db.attachments.listByUserId(u1.id)).resolves.toMatchObject([{ transactionIds: [tx1.id] }])
      await api.unlinkAttachmentFromTransaction.handler(ctx1, { id: att1.id, transactionId: tx1.id })
      await expect(db.attachments.listByUserId(u1.id)).resolves.toMatchObject([{ transactionIds: [] }])
    }),
    60000
  )

  it(
    'uploads only files that start like a PDF',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      const api = createRpcV1Attachment(db, {
        httpPort: 0,
        publicUrl: 'http://localhost',
        userRegistrationEnabled: false,
        trustProxyHops: 0,
        publicDirectory: '',
      })
      const ctx = { user, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const postScript = Buffer.from('%!PS\n(hello) print\n')
      await expect(
        api.uploadAttachment.handler(ctx, {
          fileName: 'statement.pdf',
          dataUrl: renderDataUrl('application/pdf', postScript.toString('base64')),
        })
      ).rejects.toThrow('Only accepts PDFs')
      await expect(db.attachments.listByUserId(user.id)).resolves.toEqual([])
    }),
    60000
  )
})
