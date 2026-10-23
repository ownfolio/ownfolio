// @vitest-environment node
import express from 'express'
import http from 'http'
import { AddressInfo } from 'net'
import { describe, expect, it } from 'vitest'

import { Config } from '../config'
import { databaseTest } from '../database/databaseTest'
import { createApi } from '.'

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
})
