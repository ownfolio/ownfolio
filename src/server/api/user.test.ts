// @vitest-environment node
import express from 'express'
import http from 'http'
import { AddressInfo } from 'net'
import { describe, expect, it } from 'vitest'

import { Config } from '../config'
import { databaseTest } from '../database/databaseTest'
import { createApi } from '.'
import { createRpcV1User } from './user'

describe('user', () => {
  it(
    'rate limits failed logins',
    databaseTest(async db => {
      await db.init()
      await db.users.create({ email: 'user@domain.com' }, 'password')
      const app = express()
      const server = http.createServer(app)
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      try {
        const config: Config = {
          httpPort: 0,
          publicUrl: `http://localhost:${(server.address() as AddressInfo).port}`,
          userRegistrationEnabled: false,
          trustProxyHops: 0,
          publicDirectory: '',
        }
        app.use(await createApi(db, config))
        const login = (password: string) =>
          fetch(`${config.publicUrl}/api/v1/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@domain.com', password }),
          }).then(res => res.status)

        // successful logins do not count against the limit
        for (let i = 0; i < 11; i++) {
          expect(await login('password')).toBe(200)
        }
        const failed = await Promise.all(Array.from({ length: 10 }, () => login('wrong')))
        expect(failed).toEqual(Array(10).fill(401))
        expect(await login('password')).toBe(429)
      } finally {
        await new Promise(resolve => server.close(resolve))
      }
    }),
    60000
  )

  it(
    'requires the password to change the email',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      await db.users.create({ email: 'taken@domain.com' }, 'password')
      const api = createRpcV1User(db, config)
      const ctx = { user, setSessionId: async () => {}, unsetSessionId: async () => {} }

      await expect(api.changeEmail.handler(ctx, { newEmail: 'new@domain.com', password: 'wrong' })).rejects.toThrow(
        'Password is incorrect'
      )
      await expect(
        api.changeEmail.handler(ctx, { newEmail: 'taken@domain.com', password: 'password' })
      ).rejects.toThrow('Email already taken')
      await expect(db.users.find(user.id)).resolves.toMatchObject({ email: 'user@domain.com' })
      await api.changeEmail.handler(ctx, { newEmail: 'new@domain.com', password: 'password' })
      await expect(db.users.find(user.id)).resolves.toMatchObject({ email: 'new@domain.com' })
    }),
    60000
  )

  it(
    'ends other sessions and revokes oauth tokens when changing the password',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      const otherUser = await db.users.create({ email: 'other@domain.com' }, 'password')
      const currentSession = await db.users.createSession(user.id, false)
      const otherSession = await db.users.createSession(user.id, true)
      const otherUserSession = await db.users.createSession(otherUser.id, false)
      await db.oauth.createClient({ client_id: 'client', redirect_uris: ['http://localhost/callback'] })
      const grant = { clientId: 'client', scopes: [] }
      const tokens = await db.oauth.createTokens({ ...grant, userId: user.id })
      const otherUserTokens = await db.oauth.createTokens({ ...grant, userId: otherUser.id })
      const api = createRpcV1User(db, config)
      const ctx = { user, sessionId: currentSession, setSessionId: async () => {}, unsetSessionId: async () => {} }

      await api.changePassword.handler(ctx, { oldPassword: 'password', newPassword: 'password2' })
      await expect(db.users.findBySessionId(currentSession)).resolves.toMatchObject({ id: user.id })
      await expect(db.users.findBySessionId(otherSession)).resolves.toBeUndefined()
      await expect(db.oauth.findAccessToken(tokens.accessToken)).resolves.toBeUndefined()
      await expect(db.oauth.consumeRefreshToken('client', tokens.refreshToken)).resolves.toBeUndefined()

      await expect(db.users.findBySessionId(otherUserSession)).resolves.toMatchObject({ id: otherUser.id })
      await expect(db.oauth.findAccessToken(otherUserTokens.accessToken)).resolves.toMatchObject({
        userId: otherUser.id,
      })
    }),
    60000
  )
})

const config: Config = {
  httpPort: 0,
  publicUrl: 'http://localhost',
  userRegistrationEnabled: false,
  trustProxyHops: 0,
  publicDirectory: '',
}
