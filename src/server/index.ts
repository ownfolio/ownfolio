import { Command } from 'commander'
import crypto from 'crypto'

import { createConfig } from './config'
import { Database } from './database'
import { generateDemoPortfolio } from './demo'
import { logger } from './logger'
import { createServer, runServer } from './server'

const program = new Command()
program.name('ownfolio')

program //
  .command('server')
  .action(
    longRunning(async () => {
      const config = createConfig()
      const database = new Database()
      await database.init()
      const server = await createServer(database, config)
      const serverInstance = await runServer(server, config.httpPort)

      return async () => {
        await serverInstance.close()
        await database.close()
      }
    })
  )

program //
  .command('create-user')
  .requiredOption('-e, --email <string>', 'user email')
  .option('-p, --password <string>', 'user password')
  .option('-d, --demo-portfolio')
  .action(async (opts: { email: string; password?: string; demoPortfolio?: boolean }) => {
    const database = new Database()
    await database.init()
    const email = opts.email
    const password = opts.password || crypto.randomBytes(16).toString('hex')
    const user = await database.users.create({ email }, password)
    logger.info('Created user', {
      email: email,
      password: opts.password ? '***' : password,
    })
    if (opts.demoPortfolio) {
      await generateDemoPortfolio(database, user.id)
    }
    await database.close()
  })

program //
  .command('regenerate-attachment-derivations')
  .action(async () => {
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
