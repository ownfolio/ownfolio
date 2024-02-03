import compression from 'compression'
import crypto from 'crypto'
import express from 'express'
import fs from 'fs/promises'
import path from 'path'

import { createApi } from './api'
import { Config, configToWebConfig } from './config'
import { Database } from './database'
import { logger } from './logger'

export async function createServer(database: Database, config: Config): Promise<express.Express> {
  const app = express()
  app.disable('x-powered-by')
  app.use(compression())
  app.use((req, _res, next) => {
    logger.info(`Request ${req.method} ${req.url}`)
    next()
  })

  const api = await createApi(database, config)
  app.use(api)

  app.use((req, res, next) => {
    if (req.path.match(/^\/([^/]+)\.(js|css|png|json)$/)) {
      express.static(config.publicDirectory, {
        cacheControl: true,
        maxAge: 0,
        index: false,
      })(req, res, next)
    } else {
      next()
    }
  })
  const indexHtml = await fs.readFile(path.join(config.publicDirectory, 'index.html'), 'utf-8')
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.match(/^\/(api)\//)) {
      const nonce = crypto.randomBytes(16).toString('hex')
      const indexHtmlWithConfig = indexHtml.replace(
        /<!-- config -->/,
        `<script nonce="${nonce}">window.__CONFIG__ = ${JSON.stringify(configToWebConfig(config))}</script>`
      )
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
        'Content-Security-Policy': `default-src 'self' 'nonce-${nonce}' data: blob:; style-src 'self' 'unsafe-inline';`,
      })
      res.write(indexHtmlWithConfig)
      res.end()
    } else {
      next()
    }
  })

  return app
}

export async function runServer(server: express.Express, port: number): Promise<{ close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const serverInstance = server
      .listen(port)
      .on('listening', () => {
        logger.info(`Started listening on port ${port}`)
        resolve({
          close: async () => {
            logger.info(`Stopping listening on port ${port}`)
            await serverInstance.close()
          },
        })
      })
      .on('error', error => {
        logger.error(`Listening on port ${port} failes`, { error })
        reject(error)
      })
  })
}
