import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'users',
  databaseTest(async db => {
    await db.init()
    const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password1')
    const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password2')
    await expect(db.users.findByEmail(u1.email)).resolves.toEqual(u1)
    await expect(db.users.findByEmail(u2.email)).resolves.toEqual(u2)
    await expect(db.users.findByEmail('user_unknown')).resolves.toBeUndefined()
    await expect(db.users.verifyPassword(u1.id, 'password1')).resolves.toBe(true)
    await expect(db.users.verifyPassword(u1.id, 'password2')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u2.id, 'password1')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u2.id, 'password2')).resolves.toBe(true)
    await db.users.setPassword(u1.id, 'password1-changed')
    await expect(db.users.verifyPassword(u1.id, 'password1')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u1.id, 'password1-changed')).resolves.toBe(true)
    await expect(db.users.verifyPassword(u1.id, 'password2')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u2.id, 'password1')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u2.id, 'password1-changed')).resolves.toBe(false)
    await expect(db.users.verifyPassword(u2.id, 'password2')).resolves.toBe(true)
    const s1 = await db.users.createSession(u1.id, false)
    const s2a = await db.users.createSession(u2.id, false)
    const s2b = await db.users.createSession(u2.id, false)
    expect(s1).not.toBe(s2a)
    expect(s2a).not.toBe(s2b)
    expect(s2b).not.toBe(s1)
    await expect(db.users.findBySessionId(s1)).resolves.toEqual(u1)
    await expect(db.users.findBySessionId(s2a)).resolves.toEqual(u2)
    await expect(db.users.findBySessionId(s2b)).resolves.toEqual(u2)
    await expect(db.users.findBySessionId('sess_unknown')).resolves.toBeUndefined()
    await db.users.delete(u1.id)
    await expect(db.users.findByEmail(u1.email)).resolves.toBeUndefined()
    await expect(db.users.findByEmail(u2.email)).resolves.toEqual(u2)
    await db.users.delete(u2.id)
    await expect(db.users.findByEmail(u1.email)).resolves.toBeUndefined()
    await expect(db.users.findByEmail(u2.email)).resolves.toBeUndefined()
  }),
  60000
)
