import fs from 'fs/promises'
import path from 'path'
import * as puppeteer from 'puppeteer'
import sharp from 'sharp'

import { Database } from '../src/server/database'
import { usingTestContainerDatabaseInstance } from '../src/server/database/databaseTest'
import { yahooFinanceAxios } from '../src/server/quotes/yahooFinance'
import { createServer, runServer } from '../src/server/server'
import { Portfolio } from '../src/shared/models/Portfolio'
import { User } from '../src/shared/models/User'
import { applyAxiosMock } from './axiosMock'
import { createPortolioTestData } from './testdata'
import { usingInstance } from './utils'

const isDebug = process.env.DEBUG === '1'
const screenshotsPath = path.join(__dirname, '..', 'temp', 'screenshots')
declare const document: any

const devices = [
  { id: 'desktop', width: 1440, height: 932 },
  {
    id: 'mobile',
    width: 390,
    height: 844,
    safeAreaInsetTop: 59,
    safeAreaInsetBottom: 34,
    safeAreaInsetLeft: 0,
    safeAreaInsetRight: 0,
  },
  {
    id: 'mobile-landscape',
    width: 844,
    height: 390,
    safeAreaInsetTop: 0,
    safeAreaInsetBottom: 34,
    safeAreaInsetLeft: 59,
    safeAreaInsetRight: 59,
  },
]

export async function renderScreenshots() {
  await cleanScreenshots()
  console.log('Preparing data...')
  await prepare(async ({ database, page, baseUrl, screenshot, user, portfolio }) => {
    const accounts = await database.accounts.listByUserId(user.id)
    const cryptoAccount = accounts.find(a => a.name === 'Crypto')!
    const assets = await database.assets.listByUserId(user.id)
    const bitcoinAsset = assets.find(a => a.name === 'Bitcoin')!
    const transactions = await database.transactions.listByUserId(user.id)
    const firstAssetBuyTransaction = transactions.find(t => t.data.type === 'assetBuy')!

    await page.goto(baseUrl)
    await screenshot('dashboard')

    await page.goto(baseUrl + '/chart/total')
    await screenshot('chart-total')

    await page.goto(baseUrl + `/chart/asset/${bitcoinAsset.id}`)
    await screenshot('chart-asset')

    await page.goto(baseUrl + '/portfolios')
    await screenshot('portfolios-list')

    await page.goto(baseUrl + `/portfolios?dialog=portfolio-edit-${portfolio.id}`)
    await screenshot('portfolios-edit')

    await page.goto(baseUrl + '/accounts')
    await screenshot('accounts-list')

    await page.goto(baseUrl + `/accounts?dialog=account-edit-${cryptoAccount.id}`)
    await screenshot('accounts-edit')

    await page.goto(baseUrl + '/assets')
    await screenshot('assets-list')

    await page.goto(baseUrl + `/assets?dialog=asset-edit-${bitcoinAsset.id}`)
    await screenshot('assets-edit')

    await page.goto(baseUrl + '/transactions')
    await screenshot('transactions-list')

    await page.goto(baseUrl + `/?dialog=transaction-edit-${firstAssetBuyTransaction.id}`)
    await page.waitForNetworkIdle()
    await page.waitForSelector('#root')
    await screenshot('transactions-edit')
  })
}

async function prepare(
  fn: (props: {
    database: Database
    user: User
    portfolio: Portfolio
    browser: puppeteer.Browser
    page: puppeteer.Page
    baseUrl: string
    screenshot: (name: string) => Promise<void>
  }) => Promise<void>
): Promise<void> {
  const port = 3001
  const baseUrl = `http://localhost:${port}`
  await usingTestContainerDatabaseInstance(async database => {
    const yahooFinanceAxiosMock = await applyAxiosMock(yahooFinanceAxios, __filename.replace(/\.ts$/, '.mock.json'))
    await database.init()
    const user = await database.users.create({ email: 'john@doe.com' }, 'testtest')
    const portfolio = await database.portfolios.create({ userId: user.id, name: 'Private' })
    await createPortolioTestData(database, portfolio)
    const session = await database.users.createSession(user.id, false)
    const server = await createServer(database, {
      httpPort: port,
      userRegistrationEnabled: false,
      publicDirectory: path.resolve(__dirname, '..', 'dist', 'public'),
    })
    await usingInstance(
      () => runServer(server, port),
      async () => {
        await usingInstance(
          () => puppeteer.launch({ headless: !isDebug ? 'new' : false }),
          async browser => {
            const page = await browser.newPage()
            await page.setCookie({ name: 'myfolio-session', value: session, path: '/', domain: `localhost:${port}` })
            const screenshot = async (name: string) => {
              await page.waitForNetworkIdle()
              await page.waitForSelector('#root')
              await page.evaluate(() => {
                if (document.activeElement && 'blur' in document.activeElement) {
                  document.activeElement.blur()
                }
              })
              console.log(`Screenshotting ${name}...`)
              const fileName = (deviceName?: string) =>
                path.join(screenshotsPath, deviceName ? `${name}-${deviceName}.png` : `${name}.png`)
              await devices.reduce<Promise<void>>(async (accP, device) => {
                await accP
                const frameFile = path.join(__dirname, `screenshots-${device.id}.svg`)
                await page.evaluate(`
                  document.body.style.setProperty('--safe-area-inset-top', '${device.safeAreaInsetTop || 0}px');
                  document.body.style.setProperty('--safe-area-inset-bottom', '${device.safeAreaInsetBottom || 0}px');
                  document.body.style.setProperty('--safe-area-inset-left', '${device.safeAreaInsetLeft || 0}px');
                  document.body.style.setProperty('--safe-area-inset-right', '${device.safeAreaInsetRight || 0}px');
                `)
                await page.setViewport({
                  width: device.width,
                  height: device.height,
                  deviceScaleFactor: 2,
                })
                await page.waitForTimeout(1000)
                await page.screenshot({ path: fileName(device.id) })
                const screenshotBuffer = await fs.readFile(fileName(device.id))
                const frameSvg = await fs.readFile(frameFile, 'utf8')
                await sharp(
                  Buffer.from(
                    frameSvg
                      .replace('CONTENT_PLACEHOLDER_OPACITY', '0')
                      .replace('CONTENT_DATA', screenshotBuffer.toString('base64'))
                  )
                )
                  .png()
                  .toFile(fileName(device.id))
              }, Promise.resolve())

              const mobileShift = 40
              await sharp({
                create: {
                  width: 2888 + 812 - mobileShift,
                  height: 2072 + mobileShift,
                  channels: 4,
                  background: { r: 255, g: 255, b: 255, alpha: 0 },
                },
              })
                .composite([
                  {
                    input: fileName('desktop'),
                    left: 0,
                    top: 0,
                  },
                  {
                    input: fileName('mobile'),
                    left: 2888 - mobileShift,
                    top: 2072 - 1720 + mobileShift,
                  },
                ])
                .png()
                .toFile(fileName())
            }
            await fn({ database, user, portfolio, browser, page, baseUrl, screenshot })
          }
        )
      }
    )
    await yahooFinanceAxiosMock.save()
  })()
}

async function cleanScreenshots(): Promise<void> {
  await fs.rm(screenshotsPath, { recursive: true, force: true })
  await fs.mkdir(screenshotsPath, { recursive: true })
}

async function run(): Promise<void> {
  await renderScreenshots()
}

if (require.main === module) {
  run().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
