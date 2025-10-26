// @vitest-environment node
import { it } from 'vitest'

import { databaseTest } from './database/databaseTest'
import { generateDemoPortfolio } from './demo'

it.skip(
  'demo',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    await generateDemoPortfolio(db, u.id)
  }),
  60000
)
