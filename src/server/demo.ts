import BigNumber from 'bignumber.js'

import { Account } from '../shared/models/Account'
import { Asset } from '../shared/models/Asset'
import { Portfolio } from '../shared/models/Portfolio'
import { findClosest } from '../shared/utils/array'
import { dateEndOf, dateFormat, dateList, dateParse, DateUnit } from '../shared/utils/date'
import { Database } from './database'
import { evaluateAll } from './evaluations/evaluateAll'
import { updateAssetQuotes } from './quotes'

export async function generateDemoPortfolio(database: Database, userId: string): Promise<Portfolio> {
  const currency = 'EUR' as const
  const portfolio = await database.portfolios.create({
    userId,
    name: 'Demo',
    status: 'active',
  })
  const accountSavings = await database.accounts.create({
    currency,
    portfolioId: portfolio.id,
    name: 'Savings',
    number: '',
    status: 'active',
  })
  const accountStocks = await database.accounts.create({
    currency,
    portfolioId: portfolio.id,
    name: 'Stocks',
    number: '',
    status: 'active',
  })
  const accountCrypto = await database.accounts.create({
    currency,
    portfolioId: portfolio.id,
    name: 'Crypto',
    number: '',
    status: 'active',
  })

  const assetAccumulationPlans: {
    startYear: number
    endYear?: number
    sell?: boolean
    assetTemplate: Pick<Asset, 'name' | 'number' | 'symbol' | 'denomination' | 'quoteProvider'>
    assetAccount: Account
    cashAccount: Account
    interval: DateUnit
    intervalCount: number
    cashAmount: BigNumber
  }[] = [
    {
      startYear: 2000,
      endYear: 2003,
      sell: true,
      assetTemplate: {
        name: 'Volkswagen AG',
        number: '',
        symbol: 'VOW',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'VOW.DE',
          pauseUntil: null,
        },
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(250),
    },
    {
      startYear: 2011,
      assetTemplate: {
        name: 'iShares MSCI World',
        number: '',
        symbol: 'EUNL',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'EUNL.DE',
          pauseUntil: null,
        },
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(300),
    },
    {
      startYear: 2016,
      endYear: 2019,
      assetTemplate: {
        name: 'Apple Inc.',
        number: '',
        symbol: 'AAPL',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'APC.DE',
          pauseUntil: null,
        },
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(70),
    },
    {
      startYear: 2020,
      endYear: 2020,
      sell: true,
      assetTemplate: {
        name: 'Tesla Inc.',
        number: '',
        symbol: 'TLSA',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'TL0.DE',
          pauseUntil: null,
        },
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(400),
    },
    {
      startYear: 2018,
      assetTemplate: {
        name: 'Bitcoin',
        number: '',
        symbol: 'BTC',
        denomination: 8,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'BTC-EUR',
          pauseUntil: null,
        },
      },
      assetAccount: accountCrypto,
      cashAccount: accountCrypto,
      interval: 'week',
      intervalCount: 1,
      cashAmount: BigNumber(10),
    },
  ]

  for (let i = 0; i < assetAccumulationPlans.length; i++) {
    const assetAccumulationPlan = assetAccumulationPlans[i]
    const asset = await database.assets.create({
      ...assetAccumulationPlan.assetTemplate,
      userId: portfolio.userId,
      currency,
      status: 'active',
    })
    await updateAssetQuotes(database, asset)
    const assetQuotes = await database.quotes.listByAssetId(asset.id)
    const now = new Date()
    const dates = dateList(
      dateParse(`${assetAccumulationPlan.startYear}-01-01`),
      assetAccumulationPlan.endYear ? dateEndOf(dateParse(`${assetAccumulationPlan.endYear}-01-01`), 'year') : now,
      assetAccumulationPlan.interval,
      assetAccumulationPlan.intervalCount
    )
    for (let j = 0; j < dates.length; j++) {
      const date = dates[j]
      const closestQuote = findClosest(assetQuotes, quote => Math.abs(dateParse(quote.date).valueOf() - date.valueOf()))
      if (closestQuote) {
        if (j < dates.length - 1 || !assetAccumulationPlan.sell) {
          await database.transactions.create({
            userId: portfolio.userId,
            date: dateFormat(date, 'yyyy-MM-dd'),
            time: '00:00:00',
            data: {
              type: 'cashDeposit',
              cashAccountId: assetAccumulationPlan.cashAccount.id,
              cashAmount: assetAccumulationPlan.cashAmount.decimalPlaces(2).toString(),
            },
            reference: '',
            comment: '',
          })
          const affordableAssetAmount = BigNumber(assetAccumulationPlan.cashAmount)
            .dividedBy(closestQuote.close)
            .decimalPlaces(asset.denomination, 1)
          if (affordableAssetAmount.gt(0)) {
            const cashAmount = affordableAssetAmount.multipliedBy(closestQuote.close).decimalPlaces(2)
            await database.transactions.create({
              userId: portfolio.userId,
              date: dateFormat(date, 'yyyy-MM-dd'),
              time: '09:00:00',
              data: {
                type: 'assetBuy',
                assetAccountId: assetAccumulationPlan.assetAccount.id,
                assetId: asset.id,
                assetAmount: affordableAssetAmount.toString(),
                cashAccountId: assetAccumulationPlan.cashAccount.id,
                cashAmount: cashAmount.toString(),
                feeCashAmount: '0',
              },
              reference: '',
              comment: '',
            })
          }
        } else {
          const availableAssetAmount = await evaluateAll(
            await database.transactions.listByUserId(portfolio.userId, {}, 'asc')
          ).value.accountAssetHoldings[assetAccumulationPlan.assetAccount.id][asset.id]
          const cashAmount = availableAssetAmount.multipliedBy(closestQuote.close).decimalPlaces(2)
          await database.transactions.create({
            userId: portfolio.userId,
            date: dateFormat(date, 'yyyy-MM-dd'),
            time: '18:00:00',
            data: {
              type: 'assetSell',
              assetAccountId: assetAccumulationPlan.assetAccount.id,
              assetId: asset.id,
              assetAmount: availableAssetAmount.toString(),
              cashAccountId: assetAccumulationPlan.cashAccount.id,
              cashAmount: cashAmount.toString(),
              feeCashAmount: '0',
              taxCashAmount: '0',
            },
            reference: '',
            comment: '',
          })
        }
      }
    }
  }
  return portfolio
}
