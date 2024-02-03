import crypto from 'crypto'

import { createConfig } from './config'
import { Database } from './database'
import { logger } from './logger'
import { createServer, runServer } from './server'

async function run(): Promise<{ close: () => Promise<void> }> {
  const database = new Database()
  await database.init()

  const config = createConfig()
  if (config.userEmail) {
    const userCount = await database.users.count()
    if (userCount === 0) {
      const password = config.userPassword || crypto.randomBytes(16).toString('hex')
      await database.users.create({ email: config.userEmail }, password)
      logger.info('Created user', {
        email: config.userEmail,
        password: config.userPassword ? '***' : password,
      })
    }
  }
  const server = await createServer(database, config)
  const serverInstance = await runServer(server, config.httpPort)

  return {
    close: async () => {
      await serverInstance.close()
      await database.close()
    },
  }
}

run()
  .then(({ close: stopServer }) => {
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM')
      await stopServer()
      process.exit(0)
    })
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT')
      await stopServer()
      process.exit(0)
    })
  })
  .catch(error => {
    logger.error('Failed to start', { error })
    process.exit(1)
  })
