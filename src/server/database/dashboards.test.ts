// @vitest-environment node
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'dashboards',
  databaseTest(async db => {
    await db.init()
    await expect(db.dashboards.create({ userId: 'user_unknown', key: 'd', rows: [] })).rejects.toThrow()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const d1 = await db.dashboards.create({ userId: u.id, key: 'd1', rows: [] })
    const d2 = await db.dashboards.create({ userId: u.id, key: 'd2', rows: [] })
    const d3 = await db.dashboards.create({ userId: u.id, key: 'd3', rows: [] })
    await expect(db.dashboards.retrieve('port_unknown')).rejects.toThrow()
    await expect(db.dashboards.find('port_unknown')).resolves.toBeUndefined()
    await expect(db.dashboards.retrieve(d1.id)).resolves.toEqual(d1)
    await expect(db.dashboards.find(d1.id)).resolves.toEqual(d1)
    await expect(db.dashboards.retrieve(d2.id)).resolves.toEqual(d2)
    await expect(db.dashboards.find(d2.id)).resolves.toEqual(d2)
    await expect(db.dashboards.retrieve(d3.id)).resolves.toEqual(d3)
    await expect(db.dashboards.find(d3.id)).resolves.toEqual(d3)
    await expect(db.dashboards.listByUserId(u.id)).resolves.toHaveLength(3)
    await expect(db.dashboards.listByUserId(u.id, 0, 3)).resolves.toHaveLength(3)
    await expect(db.dashboards.listByUserId(u.id, 0, 2)).resolves.toHaveLength(2)
    await expect(db.dashboards.listByUserId(u.id, 0, 1)).resolves.toHaveLength(1)
    await expect(db.dashboards.listByUserId(u.id, 1, 100)).resolves.toHaveLength(2)
    await expect(db.dashboards.listByUserId(u.id, 2, 100)).resolves.toHaveLength(1)
    await expect(db.dashboards.listByUserId(u.id, 3, 100)).resolves.toHaveLength(0)
    await expect(db.dashboards.listByUserId('user_???')).resolves.toHaveLength(0)
    await db.dashboards.delete(d2.id)
    await expect(db.dashboards.retrieve(d2.id)).rejects.toThrow()
    const d1b = await db.dashboards.update({ ...d1, rows: [{ columns: [{ type: 'totalCard' }] }] })
    await expect(db.dashboards.retrieve(d1.id)).resolves.toEqual(d1b)
  }),
  60000
)
