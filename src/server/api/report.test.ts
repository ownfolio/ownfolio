// @vitest-environment node
import fs from 'fs/promises'
import path from 'path'
import { afterAll, beforeAll, it } from 'vitest'

import { applyAxiosMock, AxiosMock } from '../../../test/axiosMock'
import { parseDataUrl } from '../../shared/utils/file'
import { databaseTest } from '../database/databaseTest'
import { generateDemoPortfolio } from '../demo'
import { yahooFinanceAxios } from '../quotes/yahooFinance'
import { createRpcV1Report } from './report'

it(
  'generateYearlyPdfReport',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    await generateDemoPortfolio(db, u.id)
    const api = createRpcV1Report(db)
    const ctx = { user: u, sessionId: u.id, setSessionId: async () => {}, unsetSessionId: async () => {} }
    const outputPath = path.resolve(__dirname, '../../../temp')
    await fs.mkdir(outputPath, { recursive: true })
    const report = await api.generateYearlyPdfReport.handler(ctx).then(r => r.data)
    await fs.writeFile(
      path.join(outputPath, 'generateYearlyPdfReport.pdf'),
      Buffer.from(parseDataUrl(report.dataUrl)[1], 'base64')
    )
  }),
  {
    timeout: 60000,
  }
)

let yahooFinanceAxiosMock: AxiosMock | undefined
beforeAll(async () => {
  yahooFinanceAxiosMock = await applyAxiosMock(yahooFinanceAxios, __filename.replace(/\.ts$/, '.mock.json'))
})
afterAll(async () => {
  await yahooFinanceAxiosMock?.save()
})
