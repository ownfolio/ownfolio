import crypto from 'crypto'
import postgres from 'postgres'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

import { Database } from '.'

export function databaseTest(fn: (database: Database) => Promise<void>): () => Promise<void> {
  return async () => {
    const containerDefinition = new GenericContainer('postgres:15')
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
    const container = await startTestContainer(containerDefinition, !process.env.CI)

    const id = 'myfolio_' + crypto.randomBytes(8).toString('hex')
    const db = postgres({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'myfolio',
      password: 'myfolio',
    })
    try {
      await db`CREATE DATABASE ${db(id)}`
      const database = new Database({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        user: 'myfolio',
        password: 'myfolio',
        database: id,
      })
      try {
        await database.ready()
        await fn(database)
      } finally {
        await database.close()
      }
    } finally {
      await db`DROP DATABASE IF EXISTS ${db(id)}`
      await db.end()
    }
  }
}

function startTestContainer(container: GenericContainer, withReuse: boolean): Promise<StartedTestContainer> {
  if (withReuse) {
    return container.withReuse().start()
  }
  return container.start()
}
