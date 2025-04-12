// @vitest-environment node
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'portfolios',
  databaseTest(async db => {
    await db.init()
    await expect(db.portfolios.create({ userId: 'user_unknown', name: 'Portfolio 1' })).rejects.toThrow()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const p1 = await db.portfolios.create({ userId: u.id, name: 'Portfolio 1' })
    const p2 = await db.portfolios.create({ userId: u.id, name: 'Portfolio 2' })
    const p3 = await db.portfolios.create({ userId: u.id, name: 'Portfolio 3' })
    await expect(db.portfolios.retrieve('port_unknown')).rejects.toThrow()
    await expect(db.portfolios.find('port_unknown')).resolves.toBeUndefined()
    await expect(db.portfolios.retrieve(p1.id)).resolves.toEqual(p1)
    await expect(db.portfolios.find(p1.id)).resolves.toEqual(p1)
    await expect(db.portfolios.retrieve(p2.id)).resolves.toEqual(p2)
    await expect(db.portfolios.find(p2.id)).resolves.toEqual(p2)
    await expect(db.portfolios.retrieve(p3.id)).resolves.toEqual(p3)
    await expect(db.portfolios.find(p3.id)).resolves.toEqual(p3)
    await expect(db.portfolios.listByUserId(u.id)).resolves.toHaveLength(3)
    await expect(db.portfolios.listByUserId(u.id, 0, 3)).resolves.toHaveLength(3)
    await expect(db.portfolios.listByUserId(u.id, 0, 2)).resolves.toHaveLength(2)
    await expect(db.portfolios.listByUserId(u.id, 0, 1)).resolves.toHaveLength(1)
    await expect(db.portfolios.listByUserId(u.id, 1, 100)).resolves.toHaveLength(2)
    await expect(db.portfolios.listByUserId(u.id, 2, 100)).resolves.toHaveLength(1)
    await expect(db.portfolios.listByUserId(u.id, 3, 100)).resolves.toHaveLength(0)
    await expect(db.portfolios.listByUserId('user_???')).resolves.toHaveLength(0)
    await db.portfolios.delete(p2.id)
    await expect(db.portfolios.retrieve(p2.id)).rejects.toThrow()
    const p1b = await db.portfolios.update({ ...p1, name: 'Portfolio 1 - updated' })
    await expect(db.portfolios.retrieve(p1.id)).resolves.toEqual(p1b)
  }),
  {
    timeout: 60000,
  }
)
