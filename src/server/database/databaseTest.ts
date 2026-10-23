import crypto from 'crypto'
import postgres from 'postgres'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

import { Database } from '.'

export function databaseTest(fn: (database: Database) => Promise<void>): () => Promise<void> {
  return async () => {
    const containerDefinition = new GenericContainer('postgres:15')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_DB: 'ownfolio',
        POSTGRES_USER: 'ownfolio',
        POSTGRES_PASSWORD: 'ownfolio',
        PGDATA: '/var/lib/postgresql/data/pgdata',
      })
      .withTmpFs({
        '/var/lib/postgresql/data/pgdata': 'rw,noexec,nosuid,size=256m',
      })
      // the image starts a temporary server for initialization and restarts afterwards, so the port is open before
      // the database is ready. Only the second ready message comes from the final server.
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    const container = await startTestContainer(containerDefinition, !process.env.CI)

    const id = 'ownfolio_' + crypto.randomBytes(8).toString('hex')
    const db = postgres({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'ownfolio',
      password: 'ownfolio',
    })
    try {
      await db`CREATE DATABASE ${db(id)}`
      const database = new Database({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        user: 'ownfolio',
        password: 'ownfolio',
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
