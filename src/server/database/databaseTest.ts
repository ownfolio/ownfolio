import crypto from 'crypto'
import postgres from 'postgres'
import { GenericContainer } from 'testcontainers'

import { Database } from '.'

export function databaseTest(fn: (database: Database) => Promise<void>): () => Promise<void> {
  if (process.env.TEST_USE_EXISTING_DATABASE === '1') {
    return usingExistingDatabaseInstance('localhost', 5432, 'myfolio', 'myfolio', fn)
  } else {
    return usingTestContainerDatabaseInstance(fn)
  }
}

export function usingExistingDatabaseInstance(
  host: string,
  port: number,
  user: string,
  password: string,
  fn: (database: Database) => Promise<void>
): () => Promise<void> {
  return async () => {
    const id = 'myfolio_' + crypto.randomBytes(8).toString('hex')
    const db = postgres({ host, port, user, password })
    await db`CREATE DATABASE ${db(id)}`
    try {
      const database = new Database({ host, port, user, password, database: id })
      try {
        await database.ready()
        await fn(database)
      } finally {
        await database.close()
      }
    } finally {
      await db`DROP DATABASE ${db(id)}`
      await db.end()
    }
  }
}

export function usingTestContainerDatabaseInstance(fn: (database: Database) => Promise<void>): () => Promise<void> {
  return async () => {
    const container = await new GenericContainer('postgres:15')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_DB: 'myfolio',
        POSTGRES_USER: 'myfolio',
        POSTGRES_PASSWORD: 'myfolio',
        PGDATA: '/var/lib/postgresql/data/pgdata',
      })
      .withTmpFs({
        '/var/lib/postgresql/data/pgdata': 'rw,noexec,nosuid,size=256m',
      })
      .start()
    try {
      const database = new Database({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        database: 'myfolio',
        user: 'myfolio',
        password: 'myfolio',
      })
      await database.ready()
      await fn(database)
    } finally {
      await container.stop()
    }
  }
}
