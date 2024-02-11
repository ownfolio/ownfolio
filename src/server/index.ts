import { Command } from 'commander'
import crypto from 'crypto'

import { createConfig } from './config'
import { Database } from './database'
import { logger } from './logger'
import { createServer, runServer } from './server'

const program = new Command()
program.name('myfolio')

program.command('server').action(
  longRunning(async () => {
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

    return async () => {
      await serverInstance.close()
      await database.close()
    }
  })
)

program.command('regenerate-attachment-derivations').action(async () => {
  const database = new Database()
  await database.init()
  await database.attachments.regenerateAllDefaultDerivations()
  await database.close()
})

program.parseAsync().catch(error => {
  logger.error('Failed to start', { error })
  process.exit(1)
})

function longRunning(fn: () => Promise<() => Promise<void>>): () => Promise<void> {
  return async () => {
    await fn().then(close => {
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM')
        await close()
        process.exit(0)
      })
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT')
        await close()
        process.exit(0)
      })
    })
  }
}
