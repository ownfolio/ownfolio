import postgres from 'postgres'

import { logger } from '../logger'
import { DatabaseAccounts } from './accounts'
import { DatabaseAssets } from './assets'
import { DatabaseAttachments } from './attachments'
import { DatabasePortfolios } from './portfolios'
import { DatabaseQuotes } from './quotes'
import { DatabaseTransactions } from './transactions'
import { DatabaseUsers } from './users'

export class Database {
  private sql: postgres.Sql<{}>

  readonly users: DatabaseUsers
  readonly portfolios: DatabasePortfolios
  readonly accounts: DatabaseAccounts
  readonly assets: DatabaseAssets
  readonly transactions: DatabaseTransactions
  readonly quotes: DatabaseQuotes
  readonly attachments: DatabaseAttachments

  constructor(opts?: postgres.Options<{}>) {
    logger.info('Connecting to database')
    this.sql = postgres({
      ...opts,
      onnotice(notice) {
        logger.debug(notice)
      },
      types: {
        date: {
          to: 1082,
          from: [1082],
          serialize: (date: string) => date,
          parse: (date: string) => date,
        },
        timestamp: {
          to: 1114,
          from: [1114],
          serialize: (timestamp: string) => timestamp,
          parse: (timestamp: string) => new Date(timestamp).toISOString().substring(0, 23),
        },
        timestamptz: {
          to: 1184,
          from: [1184],
          serialize: (timestamptz: string) => timestamptz,
          parse: (timestamptz: string) => new Date(timestamptz).toISOString(),
        },
        // numeric: {
        //   to: 1700,
        //   from: [1700],
        //   serialize: (numeric: BigNumber) => numeric.toString(),
        //   parse: (numeric: string) => BigNumber(numeric),
        // },
      },
    })
    this.users = new DatabaseUsers(this.sql)
    this.portfolios = new DatabasePortfolios(this.sql)
    this.accounts = new DatabaseAccounts(this.sql)
    this.assets = new DatabaseAssets(this.sql)
    this.transactions = new DatabaseTransactions(this.sql)
    this.quotes = new DatabaseQuotes(this.sql)
    this.attachments = new DatabaseAttachments(this.sql)
  }

  async init(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" VARCHAR(64) NOT NULL,
        "timestamp" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      )
    `

    logger.info(`Starting database migrations`)
    await this.migrate('users.init', sql => this.users.init(sql))
    await this.migrate('portfolios.init', sql => this.portfolios.init(sql))
    await this.migrate('accounts.init', sql => this.accounts.init(sql))
    await this.migrate('assets.init', sql => this.assets.init(sql))
    await this.migrate('transactions.init', sql => this.transactions.init(sql))
    await this.migrate('quotes.init', sql => this.quotes.init(sql))
    await this.migrate('attachments.init', sql => this.attachments.init(sql))
    await this.migrate('attachments.addContentTable', sql => this.attachments.addContentTable(sql))
    await this.migrate('attachments.addDerivationCacheTable', sql => this.attachments.addDerivationCacheTable(sql))
    await this.migrate('attachments.dropContentTable', sql => this.attachments.dropContentTable(sql))
    await this.migrate('attachments.addDerivationCacheMimeTypeColumn', sql =>
      this.attachments.addDerivationCacheMimeTypeColumn(sql)
    )
    await this.migrate('attachments.makeDerivationCacheExpiryOptional', sql =>
      this.attachments.makeDerivationCacheExpiryOptional(sql)
    )
    await this.migrate('portfolios.addStatusColumn', sql => this.portfolios.addStatusColumn(sql))
    logger.info(`Finished database migrations`)
  }

  private async migrate(id: string, fn: (sql: postgres.Sql<{}>) => Promise<void>) {
    await this.sql.begin(async sql => {
      const [{ count }] = await sql<{ count: number }[]>`SELECT count(1)::int FROM "_migrations" WHERE "id" = ${id}`
      if (count === 0) {
        try {
          logger.info(`Starting database migration ${id}`)
          await fn(sql)
          await sql`INSERT INTO "_migrations" ${sql({ id, timestamp: new Date().toISOString() })}`
          logger.info(`Finished database migration ${id}`)
        } catch (error) {
          logger.error(`Failed to run database migration ${id}`, { error })
          throw error
        }
      }
    })
  }

  async ready(): Promise<void> {
    const start = Date.now()
    while (Date.now() < start + 10000) {
      try {
        await this.ping()
        return
      } catch (error) {
        logger.warn('Database not yet ready', { error })
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    throw new Error('Database did not get ready')
  }

  async ping(): Promise<void> {
    await this.sql`SELECT 1`
  }

  async close(): Promise<void> {
    logger.info('Disconnecting from database')
    await this.sql.end()
  }
}
