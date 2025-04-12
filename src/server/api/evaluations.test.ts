// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { databaseTest } from '../database/databaseTest'
import { PdfParserResult } from '../pdf/parse'
import { createRpcV1Evaluations, evaluatePlausibilityResponseSchema } from './evaluations'

describe('evaluatePlausibility', () => {
  const findingsForType = (
    response: z.infer<typeof evaluatePlausibilityResponseSchema>,
    type: string
  ): z.infer<typeof evaluatePlausibilityResponseSchema>['data'] => {
    return response.data.filter(e => e.type === type)
  }
  type FindingsForType = ReturnType<typeof findingsForType>

  it(
    'transactionHasNoAttachment',
    databaseTest(async db => {
      await db.init()
      const u = await db.users.create({ email: 'user@domain.com' }, 'password')
      const api = createRpcV1Evaluations(db)
      const ctx = { user: u, sessionId: u.id, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const port = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
      const ast1 = await db.assets.create({
        userId: u.id,
        name: 'Asset 1',
        number: '',
        symbol: 'S1',
        denomination: 2,
        currency: 'EUR',
        quoteProvider: null,
        status: 'active',
      })
      const act1 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 1',
        number: '',
        status: 'active',
      })
      const act2 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 2',
        number: '',
        status: 'active',
      })
      expect(
        await api.evaluatePlausibility.handler(ctx).then(r => findingsForType(r, 'transactionHasNoAttachment'))
      ).toEqual<FindingsForType>([])
      await db.transactions.create({
        userId: u.id,
        date: '2020-01-01',
        time: '00:00:00',
        data: {
          type: 'cashDeposit',
          cashAccountId: act1.id,
          cashAmount: '1000',
        },
        reference: '',
        comment: '',
      })
      const tx2 = await db.transactions.create({
        userId: u.id,
        date: '2020-01-02',
        time: '00:00:00',
        data: {
          type: 'assetBuy',
          assetAccountId: act2.id,
          assetId: ast1.id,
          assetAmount: '10',
          cashAccountId: act1.id,
          cashAmount: '100',
          feeCashAmount: '0',
        },
        reference: '',
        comment: '',
      })
      expect(
        await api.evaluatePlausibility.handler(ctx).then(r => findingsForType(r, 'transactionHasNoAttachment'))
      ).toEqual<FindingsForType>([
        {
          type: 'transactionHasNoAttachment',
          date: '2020-01-02',
          level: 'info',
          transactionId: tx2.id,
        },
      ])
      const attm = await db.attachments.createAndWrite(u.id, 'test.txt', 'text/plain', Buffer.from('test'))
      await db.attachments.linkToTransaction(attm.id, tx2.id)
      expect(
        await api.evaluatePlausibility.handler(ctx).then(r => findingsForType(r, 'transactionHasNoAttachment'))
      ).toEqual<FindingsForType>([])
    }),
    60000
  )

  it(
    'transactionDataConflictsWithAttachmentContent',
    databaseTest(async db => {
      await db.init()
      const u = await db.users.create({ email: 'user@domain.com' }, 'password')
      const api = createRpcV1Evaluations(db)
      const ctx = { user: u, sessionId: u.id, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const port = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
      const ast1 = await db.assets.create({
        userId: u.id,
        name: 'Asset 1',
        number: '',
        symbol: 'S1',
        denomination: 2,
        currency: 'EUR',
        quoteProvider: null,
        status: 'active',
      })
      const act1 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 1',
        number: '',
        status: 'active',
      })
      const act2 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 2',
        number: '',
        status: 'active',
      })
      const tx1 = await db.transactions.create({
        userId: u.id,
        date: '2020-01-01',
        time: '00:00:00',
        data: {
          type: 'assetSell',
          assetAccountId: act2.id,
          assetId: ast1.id,
          assetAmount: '10',
          cashAccountId: act1.id,
          cashAmount: '100',
          feeCashAmount: '0',
          taxCashAmount: '0',
        },
        reference: '',
        comment: '',
      })
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionDataConflictsWithAttachmentContent'))
      ).toEqual<FindingsForType>([])
      const attm = await db.attachments.createAndWrite(u.id, 'test.txt', 'text/plain', Buffer.from('test'))
      await db.attachments.linkToTransaction(attm.id, tx1.id)
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionDataConflictsWithAttachmentContent'))
      ).toEqual<FindingsForType>([])
      await db.attachments.readDerivation(
        attm.id,
        'pdfParse',
        'application/json',
        async () =>
          Buffer.from(
            JSON.stringify({
              type: 'assetBuy',
              date: '2020-01-01',
              time: '00:00:00',
              currency: 'EUR',
              assetAmount: '10',
              assetPrice: '100',
            } as PdfParserResult),
            'utf-8'
          ),
        60 * 1000,
        true
      )
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionDataConflictsWithAttachmentContent'))
      ).toEqual<FindingsForType>([])
      await db.attachments.readDerivation(
        attm.id,
        'pdfParse',
        'application/json',
        async () =>
          Buffer.from(
            JSON.stringify({
              type: 'assetSell',
              date: '2020-01-02',
              time: '00:00:01',
              currency: 'EUR',
              assetAmount: '11',
              assetPrice: '101',
              fee: '1',
              tax: '1',
            } as PdfParserResult),
            'utf-8'
          ),
        60 * 1000,
        true
      )
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionDataConflictsWithAttachmentContent'))
      ).toEqual<FindingsForType>([
        {
          type: 'transactionDataConflictsWithAttachmentContent',
          date: '2020-01-01',
          level: 'warning',
          transactionId: tx1.id,
          attachmentId: attm.id,
          conflicts: [
            { key: 'date', actual: '2020-01-01', expected: '2020-01-02' },
            { key: 'time', actual: '00:00:00', expected: '00:00:01' },
            { key: 'assetAmount', actual: '10', expected: '11' },
            { key: 'cashAmount', actual: '100', expected: '101' },
            { key: 'feeCashAmount', actual: '0', expected: '1' },
            { key: 'taxCashAmount', actual: '0', expected: '1' },
          ],
        },
      ])
    }),
    60000
  )

  it(
    'transactionConsumesMoreAssetAmountThanAvailable',
    databaseTest(async db => {
      await db.init()
      const u = await db.users.create({ email: 'user@domain.com' }, 'password')
      const api = createRpcV1Evaluations(db)
      const ctx = { user: u, sessionId: u.id, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const port = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
      const ast1 = await db.assets.create({
        userId: u.id,
        name: 'Asset 1',
        number: '',
        symbol: 'S1',
        denomination: 2,
        currency: 'EUR',
        quoteProvider: null,
        status: 'active',
      })
      const act1 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 1',
        number: '',
        status: 'active',
      })
      const act2 = await db.accounts.create({
        currency: 'EUR',
        portfolioId: port.id,
        name: 'Account 2',
        number: '',
        status: 'active',
      })
      await db.transactions.create({
        userId: u.id,
        date: '2020-01-01',
        time: '00:00:00',
        data: {
          type: 'assetBuy',
          assetAccountId: act2.id,
          assetId: ast1.id,
          assetAmount: '10',
          cashAccountId: act1.id,
          cashAmount: '100',
          feeCashAmount: '0',
        },
        reference: '',
        comment: '',
      })
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionConsumesMoreAssetAmountThanAvailable'))
      ).toEqual<FindingsForType>([])
      const tx3 = await db.transactions.create({
        userId: u.id,
        date: '2020-01-03',
        time: '00:00:00',
        data: {
          type: 'assetSell',
          assetAccountId: act2.id,
          assetId: ast1.id,
          assetAmount: '15',
          cashAccountId: act1.id,
          cashAmount: '150',
          feeCashAmount: '0',
          taxCashAmount: '0',
        },
        reference: '',
        comment: '',
      })
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionConsumesMoreAssetAmountThanAvailable'))
      ).toEqual<FindingsForType>([
        {
          type: 'transactionConsumesMoreAssetAmountThanAvailable',
          date: '2020-01-03',
          level: 'error',
          transactionId: tx3.id,
          assetAccountId: act2.id,
          assetId: ast1.id,
          excessiveAssetAmount: '5',
        },
      ])
      await db.transactions.create({
        userId: u.id,
        date: '2020-01-02',
        time: '00:00:00',
        data: {
          type: 'assetBuy',
          assetAccountId: act2.id,
          assetId: ast1.id,
          assetAmount: '5',
          cashAccountId: act1.id,
          cashAmount: '5',
          feeCashAmount: '0',
        },
        reference: '',
        comment: '',
      })
      expect(
        await api.evaluatePlausibility
          .handler(ctx)
          .then(r => findingsForType(r, 'transactionConsumesMoreAssetAmountThanAvailable'))
      ).toEqual<FindingsForType>([])
    }),
    60000
  )
})
